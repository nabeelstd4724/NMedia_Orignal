import { createReadStream, statSync } from 'node:fs';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { HlsUrlSigner } from './hls-signing.js';
import { VideoProcessor } from './video-processor.js';

const params = { type: 'object', required: ['movieId', 'asset'], additionalProperties: false, properties: { movieId: { type: 'string', pattern: '^[A-Za-z0-9_-]+$' }, asset: { type: 'string', pattern: '^[A-Za-z0-9_.-]+$' } } } as const;

export async function videoRoutes(app: FastifyInstance, videos: VideoProcessor, signer: HlsUrlSigner): Promise<void> {
  app.get<{ Params: { movieId: string; asset: string } }>('/api/v1/media/videos/:movieId/:asset', { schema: { params } }, async (request, reply) => {
    if (!signer.verify(request.raw.url ?? request.url)) return reply.code(403).send({ error: { code: 'MEDIA_SIGNATURE_INVALID', message: 'This media URL has expired.' } });
    const path = videos.assetPath(request.params.movieId, request.params.asset);
    let size: number; try { size = statSync(path).size; } catch { return reply.code(404).send({ error: { code: 'MEDIA_NOT_FOUND', message: 'The video asset is not ready.' } }); }
    const range = request.headers.range;
    const type = request.params.asset.endsWith('.vtt') ? 'text/vtt' : request.params.asset.endsWith('.m4a') ? 'audio/mp4' : 'video/mp4';
    reply.type(type).header('accept-ranges', 'bytes').header('cache-control', 'private, max-age=300');
    if (!range) return reply.send(createReadStream(path));
    const match = range.match(/^bytes=(\d*)-(\d*)$/u); if (!match) return reply.code(416).header('content-range', `bytes */${size}`).send();
    const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]) - 1); const end = match[2] ? Number(match[2]) : size - 1;
    if (start < 0 || end < start || start >= size) return reply.code(416).header('content-range', `bytes */${size}`).send();
    reply.code(206).header('content-range', `bytes ${start}-${Math.min(end, size - 1)}/${size}`).header('content-length', String(Math.min(end, size - 1) - start + 1));
    return reply.send(createReadStream(path, { start, end: Math.min(end, size - 1) }));
  });
}
