import Database from 'better-sqlite3';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { AuthRepository } from '../auth/repository.js';
import { normalizeAccountRole } from '../auth/repository.js';
import { authenticatedUser } from '../auth/routes.js';
import type { AppConfig } from '../config/env.js';
import type { AuditRepository } from './audit.js';
import type { PlatformSettings, SettingsRepository } from '../settings/repository.js';

const settingsSchema = { type: 'object', additionalProperties: false, required: ['siteName', 'tagline', 'supportEmail', 'timezone', 'allowAnonymousWatch', 'sessionTtlSeconds', 'maxConcurrentSessions', 'maintenanceMode'], properties: { siteName: { type: 'string', minLength: 1, maxLength: 120 }, tagline: { type: 'string', maxLength: 240 }, supportEmail: { type: 'string', format: 'email' }, timezone: { type: 'string', minLength: 3, maxLength: 80 }, allowAnonymousWatch: { type: 'boolean' }, sessionTtlSeconds: { type: 'integer', minimum: 900, maximum: 2592000 }, maxConcurrentSessions: { type: 'integer', minimum: 1, maximum: 20 }, maintenanceMode: { type: 'boolean' } } } as const;
const error = (reply: { code: (status: number) => { send: (body: unknown) => unknown } }, status: number, code: string, message: string) => reply.code(status).send({ error: { code, message } });
const isAdmin = (role: unknown) => ['admin', 'super_admin'].includes(normalizeAccountRole(role));
const isSuper = (role: unknown) => normalizeAccountRole(role) === 'super_admin';

export async function settingsRoutes(app: FastifyInstance, settings: SettingsRepository, auth: AuthRepository, audit: AuditRepository, config: AppConfig): Promise<void> {
  app.get('/api/v1/admin/settings/platform', async (request, reply) => { const user = await authenticatedUser(request, auth, config); if (!user) return error(reply, 401, 'UNAUTHENTICATED', 'Authentication is required'); if (!isAdmin(user.role)) return error(reply, 403, 'FORBIDDEN', 'Admin access is required'); return reply.send({ data: { settings: await settings.get() } }); });
  app.put<{ Body: PlatformSettings }>('/api/v1/admin/settings/platform', { schema: { body: settingsSchema } }, async (request, reply) => { const user = await authenticatedUser(request, auth, config); if (!user) return error(reply, 401, 'UNAUTHENTICATED', 'Authentication is required'); if (!isAdmin(user.role)) return error(reply, 403, 'FORBIDDEN', 'Admin access is required'); const saved = await settings.save(request.body); await audit.append({ actorId: user.id, action: 'platform_settings.update', targetType: 'platform_settings', targetId: 'global' }); return reply.send({ data: { settings: saved } }); });
  app.get('/api/v1/admin/settings/backups', async (request, reply) => { const user = await authenticatedUser(request, auth, config); if (!user) return error(reply, 401, 'UNAUTHENTICATED', 'Authentication is required'); if (!isAdmin(user.role)) return error(reply, 403, 'FORBIDDEN', 'Admin access is required'); mkdirSync(config.backupRoot, { recursive: true }); const backups = readdirSync(config.backupRoot).filter((name) => name.endsWith('.sqlite')).map((name) => { const path = join(config.backupRoot, name); return { name, bytes: statSync(path).size, createdAt: statSync(path).birthtime.toISOString() }; }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); return reply.send({ data: { backups } }); });
  app.post('/api/v1/admin/settings/backups', async (request, reply) => { const user = await authenticatedUser(request, auth, config); if (!user) return error(reply, 401, 'UNAUTHENTICATED', 'Authentication is required'); if (!isSuper(user.role)) return error(reply, 403, 'FORBIDDEN', 'Super-admin access is required'); mkdirSync(config.backupRoot, { recursive: true }); const name = `nmedia-${new Date().toISOString().replace(/[:.]/gu, '-')}.sqlite`; const destination = join(config.backupRoot, name); const db = new Database(config.databasePath, { readonly: true }); try { await db.backup(destination); } finally { db.close(); } await audit.append({ actorId: user.id, action: 'backup.create', targetType: 'database_backup', targetId: name }); return reply.code(201).send({ data: { backup: { name, bytes: statSync(destination).size } } }); });
}
