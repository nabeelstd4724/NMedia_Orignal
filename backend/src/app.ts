import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import { loadConfig, type AppConfig } from './config/env.js';
import { healthRoutes } from './routes/health.js';
import { homeRoutes } from './routes/home.js';
import { SQLiteHomepageRepository } from './database/homepage-repository.js';
import { homepageRoutes } from './admin/homepage-routes.js';
import { SQLiteSettingsRepository } from './database/settings-repository.js';
import { settingsRoutes } from './admin/settings-routes.js';
import { authRoutes } from './auth/routes.js';
import { SQLiteAuthRepository } from './database/auth-repository.js';
import { catalogRoutes } from './routes/catalog.js';
import { InMemoryCatalogRepository } from './catalog/repository.js';
import { SQLiteCatalogRepository } from './database/catalog-repository.js';
import { playbackRoutes } from './routes/playback.js';
import { InMemorySubscriptionRepository } from './entitlement/repository.js';
import { viewerRoutes } from './routes/viewer.js';
import { InMemoryProgressRepository, InMemoryWatchlistRepository } from './viewer/repository.js';
import { adRoutes } from './routes/ads.js';
import { InMemoryAdRepository } from './ads/repository.js';
import { SQLiteAdRepository } from './database/ad-repository.js';
import { billingRoutes } from './billing/routes.js';
import { InMemoryPlanRepository } from './billing/plans.js';
import { SQLitePlanRepository, SQLiteSubscriptionRepository } from './database/billing-repositories.js';
import { ManualGateway } from './billing/gateway.js';
import { adminRoutes } from './admin/routes.js';
import { InMemoryAuditRepository } from './admin/audit.js';
import type { AuditRepository } from './admin/audit.js';
import { SQLiteAuditRepository } from './database/audit-repository.js';
import type { AuthRepository } from './auth/repository.js';
import type { CatalogRepository } from './catalog/repository.js';
import type { SubscriptionRepository } from './entitlement/repository.js';
import { createMetrics, recordRequest, type Metrics } from './observability/metrics.js';
import { observabilityRoutes } from './observability/routes.js';
import { LocalUploadStore, UploadError } from './media/uploads.js';
import { uploadRoutes } from './media/upload-routes.js';
import { AdCreativeProcessor } from './ads/creative-processor.js';
import { HomepageViewService } from './homepage/service.js';
import { VideoProcessor } from './media/video-processor.js';
import { videoRoutes } from './media/video-routes.js';
import { HlsUrlSigner } from './media/hls-signing.js';

export function buildApp(config: AppConfig = loadConfig(), dependencies: { authRepository?: AuthRepository; catalogRepository?: CatalogRepository; subscriptionRepository?: SubscriptionRepository; progressRepository?: InMemoryProgressRepository; watchlistRepository?: InMemoryWatchlistRepository; adRepository?: InMemoryAdRepository; auditRepository?: AuditRepository; metrics?: Metrics } = {}): FastifyInstance {
  const app = Fastify({ logger: { level: config.logLevel }, bodyLimit: config.bodyLimitBytes, requestTimeout: config.requestTimeoutMs, connectionTimeout: config.requestTimeoutMs });
  const metrics = dependencies.metrics ?? createMetrics();
  const requestStarts = new WeakMap<object, bigint>();
  app.addHook('onRequest', async (request) => { requestStarts.set(request, process.hrtime.bigint()); });
  app.addHook('onResponse', async (request, reply) => {
    const start = requestStarts.get(request);
    recordRequest(metrics, request.routeOptions.url ?? request.url, start ? Number(process.hrtime.bigint() - start) / 1e6 : 0, reply.statusCode);
    request.log.info({ event: 'http.request', method: request.method, route: request.routeOptions.url, statusCode: reply.statusCode, durationMs: start ? Number(process.hrtime.bigint() - start) / 1e6 : undefined }, 'request completed');
  });
  const authRepository = dependencies.authRepository ?? new SQLiteAuthRepository(config.databasePath);
  const catalogRepository = dependencies.catalogRepository ?? (config.nodeEnv === 'test' ? new InMemoryCatalogRepository() : new SQLiteCatalogRepository(config.databasePath));
  const subscriptionRepository = dependencies.subscriptionRepository ?? (config.nodeEnv === 'test' ? new InMemorySubscriptionRepository() : new SQLiteSubscriptionRepository(config.databasePath));
  const progressRepository = dependencies.progressRepository ?? new InMemoryProgressRepository();
  const watchlistRepository = dependencies.watchlistRepository ?? new InMemoryWatchlistRepository();
  const adRepository = dependencies.adRepository ?? (config.nodeEnv === 'test' ? new InMemoryAdRepository({ adsEnabled: config.adsEnabled, midrollIntervalMin: config.midrollIntervalMin, skipAfterSec: config.skipAfterSec, maxAdsPerSession: config.maxAdsPerSession, fallbackVastTagUrl: config.fallbackVastTagUrl }) : new SQLiteAdRepository(config.databasePath, { adsEnabled: config.adsEnabled, midrollIntervalMin: config.midrollIntervalMin, skipAfterSec: config.skipAfterSec, maxAdsPerSession: config.maxAdsPerSession, fallbackVastTagUrl: config.fallbackVastTagUrl }));
  const planRepository = config.nodeEnv === 'test' ? new InMemoryPlanRepository() : new SQLitePlanRepository(config.databasePath);
  const auditRepository = dependencies.auditRepository ?? (config.nodeEnv === 'test' ? new InMemoryAuditRepository() : new SQLiteAuditRepository(config.databasePath));
  const homepageRepository = new SQLiteHomepageRepository(config.databasePath);
  const homepageView = new HomepageViewService(homepageRepository, catalogRepository);
  const settingsRepository = new SQLiteSettingsRepository(config.databasePath, { siteName: 'NMedia', tagline: 'Stories worth staying up for.', supportEmail: 'support@example.com', timezone: 'UTC', allowAnonymousWatch: config.allowAnonymousWatch, sessionTtlSeconds: config.sessionTtlSeconds, maxConcurrentSessions: 3, maintenanceMode: false });
  const uploads = new LocalUploadStore(config.mediaRoot);
  const creativeProcessor = new AdCreativeProcessor(config.mediaRoot, uploads, adRepository);
  const videoProcessor = new VideoProcessor(config.mediaRoot, uploads);
  const hlsSigner = new HlsUrlSigner(config.hlsSigningSecret);

  app.register(cookie);
  const buckets = new Map<string, { count: number; resetAt: number }>();
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && !config.corsAllowedOrigins.includes(origin)) return reply.code(403).send({ error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Origin is not allowed' } });
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (config.nodeEnv !== 'test' && unsafe && request.headers.cookie) {
      const supplied = request.headers.origin ?? request.headers.referer;
      if (!supplied || !config.corsAllowedOrigins.some((allowed) => supplied === allowed || supplied.startsWith(`${allowed}/`))) return reply.code(403).send({ error: { code: 'CSRF_ORIGIN_REQUIRED', message: 'A trusted Origin or Referer is required' } });
    }
    if (config.corsAllowedOrigins.includes(origin ?? '')) reply.header('access-control-allow-origin', origin).header('vary', 'Origin').header('access-control-allow-credentials', 'true');
    if (request.method === 'OPTIONS') return reply.code(204).header('access-control-allow-methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS').header('access-control-allow-headers', 'Content-Type,Authorization').send();
    const now = Date.now();
    const bucket = buckets.get(request.ip);
    if (!bucket || bucket.resetAt <= now) buckets.set(request.ip, { count: 1, resetAt: now + config.rateLimitWindowMs });
    else { bucket.count += 1; if (bucket.count > config.rateLimitMax) return reply.code(429).header('retry-after', String(Math.ceil((bucket.resetAt - now) / 1000))).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }); }
  });
  app.addHook('onSend', async (_request, reply) => {
    reply.header('x-content-type-options', 'nosniff').header('x-frame-options', 'DENY').header('referrer-policy', 'no-referrer').header('permissions-policy', 'camera=(), microphone=(), geolocation=()').header('content-security-policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'self'");
  });
  app.decorate('metrics', metrics);
  app.register(async (instance) => observabilityRoutes(instance, metrics));
  app.register(healthRoutes);
   app.register(async (instance) => homeRoutes(instance, homepageRepository, catalogRepository, homepageView));
  app.register(async (instance) => catalogRoutes(instance, catalogRepository));
  app.register(async (instance) => authRoutes(instance, authRepository, config));
   app.register(async (instance) => playbackRoutes(instance, catalogRepository, authRepository, subscriptionRepository, config, adRepository, videoProcessor, hlsSigner));
  app.register(async (instance) => adRoutes(instance, adRepository, authRepository, subscriptionRepository, config));
  app.register(async (instance) => viewerRoutes(instance, catalogRepository, authRepository, progressRepository, watchlistRepository, config));
  app.register(async (instance) => billingRoutes(instance, authRepository, subscriptionRepository, planRepository, new ManualGateway(), config, auditRepository));
   app.register(async (instance) => adminRoutes(instance, catalogRepository, authRepository, subscriptionRepository, auditRepository, config, adRepository, uploads, creativeProcessor));
   app.register(async (instance) => homepageRoutes(instance, homepageRepository, authRepository, auditRepository, config, () => homepageView.invalidate()));
  app.register(async (instance) => settingsRoutes(instance, settingsRepository, authRepository, auditRepository, config));
  app.addHook('onClose', async () => { homepageRepository.close(); settingsRepository.close(); });
   app.register(async (instance) => uploadRoutes(instance, uploads, authRepository, auditRepository, config, creativeProcessor));
   app.register(async (instance) => videoRoutes(instance, videoProcessor, hlsSigner));

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof UploadError) return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
    if (!(typeof error === 'object' && error !== null && 'validation' in error)) app.log.error({ err: error }, 'request failed');
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
      ? Number(error.statusCode)
      : 500;
    const isValidationError = typeof error === 'object' && error !== null && 'validation' in error;
    const errorCode = isValidationError ? 'VALIDATION_ERROR' : (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : 'INTERNAL_ERROR');
    void reply.status(isValidationError ? 400 : statusCode).send({ error: {
      code: errorCode,
      message: isValidationError ? 'Request input is invalid' : 'An unexpected error occurred',
    } });
  });

  return app;
}
