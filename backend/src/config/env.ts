export type NodeEnvironment = 'development' | 'test' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  host: string;
  port: number;
  logLevel: string;
  authCookieName: string;
  sessionTtlSeconds: number;
  allowAnonymousWatch: boolean;
  pastDueGraceDays: number;
  adsEnabled: boolean;
  midrollIntervalMin: number;
  skipAfterSec: number;
  maxAdsPerSession: number;
  fallbackVastTagUrl?: string;
  superAdminEmail?: string;
  stripeWebhookSecret?: string;
  databasePath: string;
  backupRoot: string;
  mediaRoot: string;
  hlsSigningSecret: string;
  corsAllowedOrigins: string[];
  rateLimitMax: number;
  rateLimitWindowMs: number;
  requestTimeoutMs: number;
  bodyLimitBytes: number;
}

const allowedEnvironments = new Set<NodeEnvironment>(['development', 'test', 'production']);

function requiredString(value: string | undefined, name: string, fallback?: string): string {
  const result = value ?? fallback;
  if (!result) throw new Error(`${name} is required`);
  return result;
}

function portValue(value: string | undefined): number {
  const port = Number(value ?? '4000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

function positiveInteger(value: string | undefined, name: string, fallback: number): number {
  const result = Number(value ?? fallback);
  if (!Number.isInteger(result) || result < 1) throw new Error(`${name} must be a positive integer`);
  return result;
}

function booleanValue(value: string | undefined, name: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (value !== 'true' && value !== 'false') throw new Error(`${name} must be true or false`);
  return value === 'true';
}

function csvValue(value: string | undefined, fallback: string): string[] {
  return (value ?? fallback).split(',').map((item) => item.trim()).filter(Boolean);
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = requiredString(source.NODE_ENV, 'NODE_ENV', 'development') as NodeEnvironment;
  if (!allowedEnvironments.has(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  return {
    nodeEnv,
    host: requiredString(source.HOST, 'HOST', '127.0.0.1'),
    port: portValue(source.PORT),
    logLevel: requiredString(source.LOG_LEVEL, 'LOG_LEVEL', 'info'),
    authCookieName: requiredString(source.AUTH_COOKIE_NAME, 'AUTH_COOKIE_NAME', 'nmedia_session'),
    sessionTtlSeconds: positiveInteger(source.SESSION_TTL_SECONDS, 'SESSION_TTL_SECONDS', 60 * 60 * 24 * 7),
    allowAnonymousWatch: booleanValue(source.ALLOW_ANONYMOUS_WATCH, 'ALLOW_ANONYMOUS_WATCH', true),
    pastDueGraceDays: positiveInteger(source.PAST_DUE_GRACE_DAYS, 'PAST_DUE_GRACE_DAYS', 3),
    adsEnabled: booleanValue(source.ADS_ENABLED, 'ADS_ENABLED', true),
    midrollIntervalMin: positiveInteger(source.MIDROLL_INTERVAL_MIN, 'MIDROLL_INTERVAL_MIN', 12),
    skipAfterSec: positiveInteger(source.SKIP_AFTER_SEC, 'SKIP_AFTER_SEC', 5),
    maxAdsPerSession: positiveInteger(source.MAX_ADS_PER_SESSION, 'MAX_ADS_PER_SESSION', 4),
    fallbackVastTagUrl: source.FALLBACK_VAST_TAG_URL,
    superAdminEmail: source.SUPER_ADMIN_EMAIL?.trim().toLowerCase(),
    stripeWebhookSecret: source.STRIPE_WEBHOOK_SECRET,
    databasePath: requiredString(source.DATABASE_PATH, 'DATABASE_PATH', './data/nmedia.sqlite'),
    backupRoot: requiredString(source.BACKUP_ROOT, 'BACKUP_ROOT', './backups'),
    mediaRoot: requiredString(source.MEDIA_ROOT, 'MEDIA_ROOT', './data/media'),
    hlsSigningSecret: requiredString(source.HLS_SIGNING_SECRET, 'HLS_SIGNING_SECRET', 'development-only-change-me'),
    corsAllowedOrigins: csvValue(source.CORS_ALLOWED_ORIGINS, 'http://localhost:3000,http://127.0.0.1:3000'),
    rateLimitMax: positiveInteger(source.RATE_LIMIT_MAX, 'RATE_LIMIT_MAX', 120),
    rateLimitWindowMs: positiveInteger(source.RATE_LIMIT_WINDOW_MS, 'RATE_LIMIT_WINDOW_MS', 60000),
    requestTimeoutMs: positiveInteger(source.REQUEST_TIMEOUT_MS, 'REQUEST_TIMEOUT_MS', 15000),
    bodyLimitBytes: positiveInteger(source.BODY_LIMIT_BYTES, 'BODY_LIMIT_BYTES', 1048576),
  };
}
