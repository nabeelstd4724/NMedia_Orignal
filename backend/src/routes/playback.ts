import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config/env.js';
import { authenticatedUser } from '../auth/routes.js';
import type { AuthRepository } from '../auth/repository.js';
import type { CatalogRepository } from '../catalog/repository.js';
import { EntitlementService } from '../entitlement/service.js';
import type { SubscriptionRepository } from '../entitlement/repository.js';
import { AdService } from '../ads/service.js';
import type { AdRepository } from '../ads/repository.js';
import { HlsUrlSigner } from '../media/hls-signing.js';
import { VideoProcessor } from '../media/video-processor.js';

const paramsSchema = { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[A-Za-z0-9_-]+$' } } } as const;

export async function playbackRoutes(app: FastifyInstance, catalog: CatalogRepository, auth: AuthRepository, subscriptions: SubscriptionRepository, config: AppConfig, ads?: AdRepository, videos?: VideoProcessor, signer = new HlsUrlSigner(config.hlsSigningSecret)): Promise<void> {
  const entitlement = new EntitlementService(subscriptions, config, ads ? new AdService(ads) : undefined);
  app.get<{ Params: { id: string } }>('/api/v1/movies/:id/playback', { schema: { params: paramsSchema } }, async (request, reply) => {
    const movie = await catalog.findPublishedById(request.params.id);
    if (!movie) return reply.code(404).send({ error: { code: 'MOVIE_NOT_FOUND', message: 'Movie was not found' } });
    const user = await authenticatedUser(request, auth, config);
    const playback = await entitlement.getPlayback(movie, user?.id ?? null);
    if (playback.entitlement === 'allowed' && videos) {
      let media;
      try { media = await videos.ensure(movie); } catch { return reply.code(503).send({ error: { code: 'VIDEO_NOT_READY', message: 'The uploaded movie is still being converted for playback.' } }); }
      if (media) {
        const url = (asset: string) => signer.sign(`/api/v1/media/videos/${encodeURIComponent(movie.id)}/${asset}`);
        return { data: { ...playback, sourceUrl: url(media.source), hlsUrl: url(media.source), audioTracks: media.audioTracks.map((track) => ({ language: track.language, label: track.label, url: url(track.asset) })), subtitles: media.subtitles.map((track) => ({ language: track.language, label: track.label, url: url(track.asset) })) } };
      }
    }
    return { data: playback };
  });
}
