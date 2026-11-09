import { createReadStream, existsSync } from 'node:fs';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthRepository } from '../auth/repository.js';
import { normalizeAccountRole } from '../auth/repository.js';
import { authenticatedUser } from '../auth/routes.js';
import type { AppConfig } from '../config/env.js';
import type { AuditRepository } from '../admin/audit.js';
import { LocalUploadStore, UploadError } from './uploads.js';
import { MEDIA_TYPES, UPLOAD_CHUNK_BYTES, type StartMediaUpload } from '../../../contracts/src/index.js';
import type { AdCreativeProcessor } from '../ads/creative-processor.js';

const params = { type: 'object', required: ['id'], additionalProperties: false, properties: { id: { type: 'string', format: 'uuid' } } } as const;

export async function uploadRoutes(app: FastifyInstance, store: LocalUploadStore, auth: AuthRepository, audit: AuditRepository, config: AppConfig, creativeProcessor?: AdCreativeProcessor): Promise<void> {
  // Scoped parser: existing JSON API limits are unchanged.
  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: UPLOAD_CHUNK_BYTES }, (_request, body, done) => done(null, body));
  const actors = new WeakMap<FastifyRequest, string>();
  const authorize = async (request: FastifyRequest) => {
    const user = await authenticatedUser(request, auth, config);
    if (!user) throw new UploadError(401, 'UNAUTHENTICATED', 'Sign in before uploading files.');
    if (!['editor', 'admin', 'super_admin'].includes(normalizeAccountRole(user.role))) throw new UploadError(403, 'FORBIDDEN', 'Editor access is required to upload files.');
    actors.set(request, user.id);
  };
  app.post<{ Body: StartMediaUpload }>('/api/v1/admin/media/uploads', { onRequest: authorize, schema: { body: {
    type: 'object', additionalProperties: false, required: ['filename', 'kind', 'contentType', 'size'], properties: {
      filename: { type: 'string', minLength: 1, maxLength: 255 }, kind: { type: 'string', enum: ['image', 'video'] },
      contentType: { type: 'string', enum: [...MEDIA_TYPES] }, size: { type: 'integer', minimum: 1, maximum: 2147483648 },
    },
  } } }, async (request, reply) => reply.code(201).send({ data: store.start(request.body, actors.get(request)!) }));
  app.put<{ Params: { id: string }; Querystring: { offset: number }; Body: Buffer }>('/api/v1/admin/media/uploads/:id', {
    onRequest: authorize, bodyLimit: UPLOAD_CHUNK_BYTES, schema: { params, querystring: { type: 'object', required: ['offset'], additionalProperties: false, properties: { offset: { type: 'integer', minimum: 0, maximum: 2147483648 } } } },
  }, async (request) => {
    if (!Buffer.isBuffer(request.body)) throw new UploadError(415, 'FILE_TYPE', 'Send binary file data.');
    return { data: { offset: store.append(request.params.id, actors.get(request)!, request.query.offset, request.body) } };
  });
  app.post<{ Params: { id: string } }>('/api/v1/admin/media/uploads/:id/complete', { onRequest: authorize, schema: { params } }, async (request) => {
    const upload = store.finish(request.params.id, actors.get(request)!);
    await audit.append({ actorId: actors.get(request)!, action: 'media.upload', targetType: 'upload', targetId: upload.id, metadata: { kind: upload.kind } });
    return { data: upload };
  });
  app.delete<{ Params: { id: string } }>('/api/v1/admin/media/uploads/:id', { onRequest: authorize, schema: { params } }, async (request) => {
    store.cancel(request.params.id, actors.get(request)!);
    return { data: { cancelled: true } };
  });
  app.get<{ Params: { id: string } }>('/api/v1/media/images/:id', { schema: { params } }, async (request, reply) => {
    const upload = store.get(request.params.id);
    if (!upload || upload.kind !== 'image') throw new UploadError(404, 'UPLOAD_NOT_FOUND', 'Image was not found.');
    return reply.type(upload.contentType).header('cache-control', 'public, max-age=31536000, immutable').send(createReadStream(store.path(upload.id)));
  });
  app.get<{ Params: { id: string } }>('/api/v1/media/ads/:id', { schema: { params } }, async (request, reply) => {
    const upload = store.get(request.params.id);
    if (!upload || upload.kind !== 'video') throw new UploadError(404, 'UPLOAD_NOT_FOUND', 'Ad creative was not found.');
    return reply.type(upload.contentType).header('cache-control', 'public, max-age=3600').send(createReadStream(store.path(upload.id)));
  });
  app.get<{ Params: { id: string } }>('/api/v1/media/ads/campaigns/:id/creative', { schema: { params } }, async (request, reply) => {
    if (!creativeProcessor) throw new UploadError(503, 'CREATIVE_PROCESSOR_UNAVAILABLE', 'Creative processing is not configured.');
    const path = creativeProcessor.outputPath(request.params.id, 'creative');
    if (!existsSync(path)) throw new UploadError(404, 'CREATIVE_NOT_READY', 'The ad creative is not ready.');
    return reply.type('video/mp4').header('cache-control', 'public, max-age=3600').send(createReadStream(path));
  });
  app.get<{ Params: { id: string } }>('/api/v1/media/ads/campaigns/:id/thumbnail', { schema: { params } }, async (request, reply) => {
    if (!creativeProcessor) throw new UploadError(503, 'CREATIVE_PROCESSOR_UNAVAILABLE', 'Creative processing is not configured.');
    const path = creativeProcessor.outputPath(request.params.id, 'thumbnail');
    if (!existsSync(path)) throw new UploadError(404, 'CREATIVE_NOT_READY', 'The ad thumbnail is not ready.');
    return reply.type('image/jpeg').header('cache-control', 'public, max-age=3600').send(createReadStream(path));
  });
}
