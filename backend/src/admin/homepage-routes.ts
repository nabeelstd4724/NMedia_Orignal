import type { FastifyInstance } from 'fastify';
import type { AuthRepository } from '../auth/repository.js';
import { normalizeAccountRole } from '../auth/repository.js';
import { authenticatedUser } from '../auth/routes.js';
import type { AppConfig } from '../config/env.js';
import type { AuditRepository } from './audit.js';
import type { HomepageRepository } from '../homepage/repository.js';
import type { HomeResponse } from '../../../contracts/src/index.js';

const error = (reply: { code: (status: number) => { send: (body: unknown) => unknown } }, status: number, code: string, message: string) => reply.code(status).send({ error: { code, message } });
const allowed = (role: unknown) => ['admin', 'super_admin'].includes(normalizeAccountRole(role));

export async function homepageRoutes(app: FastifyInstance, homepage: HomepageRepository, auth: AuthRepository, audit: AuditRepository, config: AppConfig, onChanged?: () => void): Promise<void> {
  app.get('/api/v1/admin/homepage', async (request, reply) => { const user = await authenticatedUser(request, auth, config); if (!user) return error(reply, 401, 'UNAUTHENTICATED', 'Authentication is required'); if (!allowed(user.role)) return error(reply, 403, 'FORBIDDEN', 'Admin access is required'); return reply.send({ data: { draft: await homepage.getDraft(), published: await homepage.getPublished(), versions: await homepage.listVersions() } }); });
  app.put<{ Body: HomeResponse }>('/api/v1/admin/homepage/draft', async (request, reply) => { const user = await authenticatedUser(request, auth, config); if (!user) return error(reply, 401, 'UNAUTHENTICATED', 'Authentication is required'); if (!allowed(user.role)) return error(reply, 403, 'FORBIDDEN', 'Admin access is required'); const draft = await homepage.saveDraft(request.body); onChanged?.(); await audit.append({ actorId: user.id, action: 'homepage.draft.save', targetType: 'homepage', targetId: 'global' }); return reply.send({ data: { draft } }); });
  app.post('/api/v1/admin/homepage/publish', async (request, reply) => { const user = await authenticatedUser(request, auth, config); if (!user) return error(reply, 401, 'UNAUTHENTICATED', 'Authentication is required'); if (!allowed(user.role)) return error(reply, 403, 'FORBIDDEN', 'Admin access is required'); const version = await homepage.publish(); onChanged?.(); await audit.append({ actorId: user.id, action: 'homepage.publish', targetType: 'homepage', targetId: 'global', metadata: { version: String(version.version) } }); return reply.send({ data: { version } }); });
  app.get('/api/v1/admin/homepage/versions', async (request, reply) => { const user = await authenticatedUser(request, auth, config); if (!user) return error(reply, 401, 'UNAUTHENTICATED', 'Authentication is required'); if (!allowed(user.role)) return error(reply, 403, 'FORBIDDEN', 'Admin access is required'); return reply.send({ data: { versions: await homepage.listVersions() } }); });
  app.post<{ Params: { version: string } }>('/api/v1/admin/homepage/versions/:version/restore', async (request, reply) => { const user = await authenticatedUser(request, auth, config); if (!user) return error(reply, 401, 'UNAUTHENTICATED', 'Authentication is required'); if (!allowed(user.role)) return error(reply, 403, 'FORBIDDEN', 'Admin access is required'); const restored = await homepage.restore(Number(request.params.version)); if (!restored) return error(reply, 404, 'VERSION_NOT_FOUND', 'Homepage version was not found'); onChanged?.(); await audit.append({ actorId: user.id, action: 'homepage.restore', targetType: 'homepage', targetId: 'global', metadata: { version: request.params.version } }); return reply.send({ data: { draft: restored } }); });
}
