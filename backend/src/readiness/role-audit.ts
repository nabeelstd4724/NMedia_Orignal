import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { buildApp } from '../app.js';
import { InMemoryAuthRepository } from '../auth/repository.js';
import { hashPassword } from '../auth/password.js';
import { InMemoryCatalogRepository } from '../catalog/repository.js';
import { InMemorySubscriptionRepository } from '../entitlement/repository.js';

const root = mkdtempSync(join(process.cwd(), '.role-audit-'));
const config = { nodeEnv: 'test' as const, host: '127.0.0.1', port: 4000, logLevel: 'silent', authCookieName: 'nmedia_session', sessionTtlSeconds: 3600, allowAnonymousWatch: true, pastDueGraceDays: 3, adsEnabled: true, midrollIntervalMin: 12, skipAfterSec: 5, maxAdsPerSession: 4, superAdminEmail: 'super@example.com', databasePath: join(root, 'nmedia.sqlite'), backupRoot: join(root, 'backups'), mediaRoot: join(root, 'media'), hlsSigningSecret: 'role-audit-secret', corsAllowedOrigins: ['http://localhost:3000'], rateLimitMax: 1000, rateLimitWindowMs: 60000, requestTimeoutMs: 15000, bodyLimitBytes: 1048576 };
const auth = new InMemoryAuthRepository();
const catalog = new InMemoryCatalogRepository();
const subscriptions = new InMemorySubscriptionRepository();
await auth.createUser('admin@example.com', 'Admin', await hashPassword('correct horse'), 'admin');
const app = buildApp(config, { authRepository: auth, catalogRepository: catalog, subscriptionRepository: subscriptions });

async function cookie(email: string, rolePassword = 'correct horse'): Promise<string> {
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: rolePassword } });
  assert.equal(response.statusCode, 200);
  const header = response.headers['set-cookie']; assert.ok(header);
  return (Array.isArray(header) ? header[0] : header).split(';')[0];
}
async function status(method: 'GET' | 'POST', url: string, headers?: { cookie: string }, payload?: unknown): Promise<number> {
  const response = await app.inject({ method: method as 'GET', url, headers, ...(payload === undefined ? {} : { payload: payload as Record<string, string> }) });
  return response.statusCode;
}

try {
  const normal = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { displayName: 'Normal User', email: 'normal@example.com', password: 'correct horse' } });
  assert.equal(normal.statusCode, 201);
  const normalCookie = (Array.isArray(normal.headers['set-cookie']) ? normal.headers['set-cookie'][0] : normal.headers['set-cookie']!).split(';')[0];
  const superRegister = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { displayName: 'Super Admin', email: 'super@example.com', password: 'correct horse' } });
  assert.equal(superRegister.statusCode, 201);
  const superCookie = (Array.isArray(superRegister.headers['set-cookie']) ? superRegister.headers['set-cookie'][0] : superRegister.headers['set-cookie']!).split(';')[0];
  const adminCookie = await cookie('admin@example.com');
  const userId = normal.json().data.user.id as string;
  const matrix = [
    ['normal user', normalCookie, [['/api/v1/movies', 200], ['/api/v1/admin/movies', 403], ['/api/v1/admin/stats/overview', 403], ['/api/v1/admin/homepage', 403], ['/api/v1/admin/audit-logs', 403], ['/api/v1/admin/subscriptions/grant', 403]]],
    ['admin', adminCookie, [['/api/v1/movies', 200], ['/api/v1/admin/movies', 200], ['/api/v1/admin/stats/overview', 200], ['/api/v1/admin/homepage', 200], ['/api/v1/admin/audit-logs', 403], ['/api/v1/admin/subscriptions/grant', 403]]],
    ['super-admin', superCookie, [['/api/v1/movies', 200], ['/api/v1/admin/movies', 200], ['/api/v1/admin/stats/overview', 200], ['/api/v1/admin/homepage', 200], ['/api/v1/admin/audit-logs', 200], ['/api/v1/admin/subscriptions/grant', 201]]],
  ] as const;
  for (const [role, roleCookie, checks] of matrix) for (const [url, expected] of checks) {
    const payload = url.endsWith('/grant') ? { userId, planId: 'premium-monthly' } : undefined;
    const actual = await status(url.endsWith('/grant') ? 'POST' : 'GET', url, { cookie: roleCookie }, payload);
    assert.equal(actual, expected, `${role} ${url}`);
  }
  console.info('Role readiness audit passed: normal user, admin and super-admin access matrix.');
} finally { await app.close(); rmSync(root, { recursive: true, force: true }); }
