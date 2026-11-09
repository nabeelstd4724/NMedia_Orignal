import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../config/env.js';
import { hashPassword, verifyPassword } from './password.js';
import { normalizeAccountRole, type AuthRepository, type UserRecord } from './repository.js';
import { createTotpSecret, otpauthUrl, verifyTotp } from './totp.js';

const credentialsSchema = {
  type: 'object', additionalProperties: false,
  required: ['email', 'password'],
  properties: { email: { type: 'string', minLength: 3, maxLength: 320, format: 'email' }, password: { type: 'string', minLength: 8, maxLength: 128 } },
} as const;
const registrationSchema = {
  type: 'object', additionalProperties: false,
  required: ['displayName', 'email', 'password'],
  properties: { displayName: { type: 'string', minLength: 2, maxLength: 80 }, email: { type: 'string', minLength: 3, maxLength: 320, format: 'email' }, password: { type: 'string', minLength: 8, maxLength: 128 } },
} as const;
const publicUser = (user: UserRecord) => ({ id: user.id, email: user.email, displayName: user.displayName, role: user.role, createdAt: user.createdAt, totpEnabled: Boolean(user.totpEnabled) });
const totpSchema = { type: 'object', additionalProperties: false, required: ['code'], properties: { code: { type: 'string', pattern: '^\\d{6}$' } } } as const;
const staffUser = (user: UserRecord) => ['editor', 'admin', 'super_admin'].includes(normalizeAccountRole(user.role));

function setSessionCookie(reply: FastifyReply, config: AppConfig, token: string): void {
  reply.setCookie(config.authCookieName, token, { httpOnly: true, sameSite: 'lax', secure: config.nodeEnv === 'production', path: '/', maxAge: config.sessionTtlSeconds });
}

export async function authenticatedUser(request: FastifyRequest, repo: AuthRepository, config: AppConfig): Promise<UserRecord | null> {
  const token = request.cookies[config.authCookieName];
  if (!token) return null;
  const session = await repo.findSession(token);
  if (!session) return null;
  const user = await repo.findUserById(session.userId);
  if (!user || user.status !== 'active') {
    await repo.deleteSession(token);
    return null;
  }
  return user;
}

export async function authRoutes(app: FastifyInstance, repo: AuthRepository, config: AppConfig): Promise<void> {
  app.post<{ Body: { displayName: string; email: string; password: string } }>('/api/v1/auth/register', { schema: { body: registrationSchema } }, async (request, reply) => {
    const email = request.body.email.trim().toLowerCase();
    if (await repo.findUserByEmail(email)) return reply.code(409).send({ error: { code: 'EMAIL_IN_USE', message: 'An account with that email already exists' } });
    const user = await repo.createUser(email, request.body.displayName.trim(), await hashPassword(request.body.password), config.superAdminEmail === email ? 'super_admin' : 'user');
    const session = await repo.createSession(user.id, Date.now() + config.sessionTtlSeconds * 1000);
    setSessionCookie(reply, config, session.token);
    return reply.code(201).send({ data: { user: publicUser(user) } });
  });

  app.post<{ Body: { email: string; password: string } }>('/api/v1/auth/login', { schema: { body: credentialsSchema } }, async (request, reply) => {
    const email = request.body.email.trim().toLowerCase();
    const user = await repo.findUserByEmail(email);
    if (!user || user.status !== 'active' || !(await verifyPassword(request.body.password, user.passwordHash))) return reply.code(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    const session = await repo.createSession(user.id, Date.now() + config.sessionTtlSeconds * 1000);
    setSessionCookie(reply, config, session.token);
    return reply.send({ data: { user: publicUser(user) } });
  });

  app.post('/api/v1/auth/logout', async (request, reply) => {
    const token = request.cookies[config.authCookieName];
    if (token) await repo.deleteSession(token);
    reply.clearCookie(config.authCookieName, { httpOnly: true, sameSite: 'lax', secure: config.nodeEnv === 'production', path: '/' });
    return reply.send({ data: { loggedOut: true } });
  });

  app.post('/api/v1/auth/refresh', async (request, reply) => {
    const token = request.cookies[config.authCookieName];
    if (!token) return reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } });
    const expiresAt = Date.now() + config.sessionTtlSeconds * 1000;
    const current = repo.rotateSession ? null : await repo.findSession(token);
    const rotated = repo.rotateSession ? await repo.rotateSession(token, expiresAt) : (current ? (await repo.deleteSession(token), await repo.createSession(current.userId, expiresAt)) : null);
    if (!rotated) return reply.code(401).send({ error: { code: 'SESSION_REUSE_DETECTED', message: 'Session reuse detected; sign in again' } });
    setSessionCookie(reply, config, rotated.token);
    const user = await repo.findUserById(rotated.userId);
    if (!user || user.status !== 'active') return reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } });
    return reply.send({ data: { user: publicUser(user) } });
  });

  app.get('/api/v1/auth/me', async (request, reply) => {
    const user = await authenticatedUser(request, repo, config);
    if (!user) return reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } });
    return reply.send({ data: { user: publicUser(user) } });
  });

  app.post('/api/v1/auth/totp/setup', async (request, reply) => {
    const user = await authenticatedUser(request, repo, config);
    if (!user) return reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } });
    if (!staffUser(user)) return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Staff access is required' } });
    const secret = createTotpSecret();
    const updated = await repo.setTotp(user.id, secret, false);
    if (!updated) return reply.code(404).send({ error: { code: 'USER_NOT_FOUND', message: 'User was not found' } });
    return reply.send({ data: { secret, otpauthUrl: otpauthUrl(secret, user.email), user: publicUser(updated) } });
  });

  app.post<{ Body: { code: string } }>('/api/v1/auth/totp/verify', { schema: { body: totpSchema } }, async (request, reply) => {
    const user = await authenticatedUser(request, repo, config);
    if (!user) return reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } });
    if (!staffUser(user) || !user.totpSecret || !verifyTotp(user.totpSecret, request.body.code)) return reply.code(400).send({ error: { code: 'INVALID_TOTP', message: 'The authenticator code is invalid.' } });
    const updated = await repo.setTotp(user.id, user.totpSecret, true);
    return reply.send({ data: { user: updated ? publicUser(updated) : publicUser(user) } });
  });

  app.post<{ Body: { code: string } }>('/api/v1/auth/totp/disable', { schema: { body: totpSchema } }, async (request, reply) => {
    const user = await authenticatedUser(request, repo, config);
    if (!user) return reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } });
    if (!staffUser(user) || !user.totpSecret || !verifyTotp(user.totpSecret, request.body.code)) return reply.code(400).send({ error: { code: 'INVALID_TOTP', message: 'The authenticator code is invalid.' } });
    const updated = await repo.setTotp(user.id, null, false);
    return reply.send({ data: { user: updated ? publicUser(updated) : publicUser(user) } });
  });
}
