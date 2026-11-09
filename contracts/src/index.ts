export type AccessLevel = 'free_with_ads' | 'premium';
export type MediaKind = 'image' | 'video';
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 2 * 1024 * 1024 * 1024;
export const UPLOAD_CHUNK_BYTES = 4 * 1024 * 1024;
export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/x-matroska', 'video/matroska'] as const;
export interface StartMediaUpload {
  filename: string;
  contentType: typeof MEDIA_TYPES[number];
  kind: MediaKind;
  size: number;
}
export interface MediaUploadReceipt extends StartMediaUpload {
  id: string;
  /** API-relative image URL. Original movie files deliberately have no public URL. */
  url?: string;
}
export type MovieStatus = 'draft' | 'scheduled' | 'published' | 'archived';
/** `super_admin` remains the persisted/wire spelling for compatibility. */
export type AccountRole = 'user' | 'editor' | 'admin' | 'super_admin';
export type AdminModule = 'overview' | 'movies' | 'homepage' | 'ads' | 'users' | 'settings' | 'audit';
export const ADMIN_MODULES: readonly AdminModule[] = ['overview', 'movies', 'homepage', 'ads', 'users', 'settings', 'audit'];
export const ADMIN_MODULE_ACCESS: Record<AdminModule, readonly AccountRole[]> = {
  overview: ['editor', 'admin', 'super_admin'],
  movies: ['editor', 'admin', 'super_admin'],
  homepage: ['admin', 'super_admin'],
  ads: ['admin', 'super_admin'],
  users: ['super_admin'],
  settings: ['admin', 'super_admin'],
  audit: ['super_admin'],
};
export type AdPlacement = 'preroll' | 'midroll';
export interface AdSettingsContract { adsEnabled: boolean; midrollIntervalMin: number; skipAfterSec: number; maxAdsPerSession: number; fallbackVastTagUrl?: string; }
export interface AdminUpload { id: string; filename: string; mediaUrl: string; contentType?: string; createdAt: string; }
export interface StripeWebhookReceipt { received: boolean; duplicate: boolean; }

export interface MovieSummary {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  year: number;
  runtimeMin: number;
  ageRating: string;
  accessLevel: AccessLevel;
  posterUrl: string;
  backdropUrl: string;
  rating: number;
  genres: string[];
  collectionIds?: string[];
}

export interface AdminMovie extends MovieSummary { status: MovieStatus; videoUploadId?: string; }
export interface AdminOverviewStats {
  movies: { total: number; published: number; draft: number; scheduled: number; archived: number };
  users: { total: number };
  subscriptions: { active: number };
}
export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface HeroItem extends MovieSummary {
  eyebrow: string;
  accent: string;
  ctaLabel: string;
}

export interface HeroSlide {
  id: string;
  movieId: string;
  eyebrow: string;
  accent: string;
  ctaLabel: string;
  active: boolean;
  order: number;
  startAt?: string | null;
  endAt?: string | null;
}

export interface HomeRow {
  id: string;
  title: string;
  type: 'manual' | 'auto';
  items: MovieSummary[];
}

export interface HomeResponse {
  hero: HeroItem;
  heroes: HeroItem[];
  heroSlides?: HeroSlide[];
  rows: HomeRow[];
}

export interface ApiSuccess<T> {
  data: T;
  meta?: { page?: number; limit?: number; total: number; totalPages?: number };
}

export interface MovieListQuery {
  q?: string;
  genre?: string;
  year?: number;
  access?: AccessLevel;
  sort?: 'title' | 'year' | 'rating' | 'popular' | 'newest' | 'alphabetical';
  page: number;
  limit: number;
}

export interface MovieListResponse {
  movies: MovieSummary[];
}

export interface GenresResponse {
  genres: string[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, string> };
}

export type PlanInterval = 'month' | 'year';
export interface Plan {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  interval: PlanInterval;
  accessLevel: AccessLevel;
  active: boolean;
}
export interface PlansResponse { plans: Plan[]; }
export interface SubscriptionView {
  plan: Plan;
  status: 'active' | 'past_due' | 'canceled';
  currentPeriodEndsAt: string | null;
  source: 'free' | 'manual' | 'provider';
}
export interface SubscriptionResponse { subscription: SubscriptionView; }

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  role: AccountRole;
}

export interface AuthSession {
  user: AuthUser;
}

export type PlaybackEntitlement = 'allowed' | 'paywall';

export interface PlaybackResponse {
  movieId: string;
  entitlement: PlaybackEntitlement;
  hlsUrl?: string;
  sourceUrl?: string;
  expiresAt?: string;
  resumeSeconds: number;
  subtitles: Array<{ language: string; label: string; url: string }>;
  audioTracks: Array<{ language: string; label: string; url: string }>;
  ads: {
    enabled: boolean;
    preroll: string[];
    midroll: string[];
    skipAfterSec: number;
    selectedCampaignId?: string;
  };
  upgradeUrl?: string;
}

export interface ViewerProgress {
  movieId: string;
  positionSeconds: number;
  durationSeconds?: number;
  completed: boolean;
  updatedAt: string;
}

export interface UpdateViewerProgressRequest {
  positionSeconds: number;
  durationSeconds?: number;
  completed?: boolean;
}

export interface ViewerProgressResponse {
  progress: ViewerProgress;
}

export interface ContinueWatchingItem extends MovieSummary {
  progress: ViewerProgress;
}

export interface ContinueWatchingResponse {
  movies: ContinueWatchingItem[];
}

export interface WatchlistItem extends MovieSummary {
  addedAt: string;
}

export interface WatchlistResponse {
  movies: WatchlistItem[];
}
