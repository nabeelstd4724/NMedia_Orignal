import type { AdminOverviewStats, AuditLogEntry, HomeResponse, MovieSummary } from '@nmedia/contracts';
import { baseUrl, del, get, patch, post, put } from './apiClient';

export interface AdminMovie extends MovieSummary { status: 'draft' | 'scheduled' | 'published' | 'archived'; videoUploadId?: string; }
export interface CreateMovieInput extends Omit<MovieSummary, 'id'> { status?: AdminMovie['status']; videoUploadId?: string; }
export interface AdminUserSubscription { planId?: string; status: 'active' | 'past_due' | 'canceled'; currentPeriodEndsAt: number; source?: 'manual' | 'provider'; }
export interface AdminUser { id: string; email: string; displayName: string; createdAt: string; role: 'user' | 'editor' | 'admin' | 'super_admin'; status: 'active' | 'suspended' | 'deleted'; subscription?: AdminUserSubscription | null; }
export interface AdSettings { adsEnabled: boolean; prerollEnabled?: boolean; midrollEnabled?: boolean; anonymousAdsEnabled?: boolean; testMode?: boolean; midrollIntervalMin: number; skipAfterSec: number; maxAdsPerSession: number; fallbackVastTagUrl?: string; }
export interface AdCampaign { id: string; name: string; active: boolean; archived?: boolean; startsAt: string; endsAt: string; placements: string[]; priority: number; weight: number; cpmCents?: number; kind: string; vastTagUrl?: string; mediaUrl?: string; creativeUploadId?: string; clickThroughUrl?: string; durationSec?: number; targeting?: { countries?: string[]; genres?: string[] }; impressionCap?: number; frequencyCap?: number; }
export interface AdCampaignPage { campaigns: AdCampaign[]; meta: { page: number; limit: number; total: number; totalPages: number }; }
export interface AdExclusion { id: string; scope: 'title' | 'collection'; targetId: string; createdAt: string; }
export interface AdCreativeStatus { campaignId: string; status: 'pending' | 'processing' | 'ready' | 'failed'; progress: number; attempt: number; durationSec?: number; mediaUrl?: string; thumbnailUrl?: string; error?: string; updatedAt: string; }
export interface AdReportFilters { from?: string; to?: string; }
export interface AdReportRow { campaignId: string; impressions: number; starts: number; quartiles: number; completes: number; skips: number; clicks: number; errors: number; completionRate: number; clickRate: number; uniqueSessions: number; cpmCents?: number; estimatedSpendCents: number; }
export interface AdErrorReportRow { campaignId: string; errorCode: string; errors: number; lastSeenAt: string; }
export interface VastDiagnostic { code: string; message: string; level: 'error' | 'warning' | 'info'; }
export interface VastDiagnosticHop { url: string; kind: 'request' | 'redirect' | 'wrapper'; status?: number; bytes: number; contentType?: string; location?: string; }
export interface VastDiagnosticResult { ok: boolean; source: 'hosted' | 'remote'; url?: string; status?: number; contentType?: string; bytes: number; adCount: number; mediaFileCount: number; mediaUrls: string[]; creativeDurationSec?: number; trackingEvents: Record<'impression' | 'start' | 'firstQuartile' | 'midpoint' | 'thirdQuartile' | 'complete' | 'click' | 'error', number>; chain: VastDiagnosticHop[]; diagnostics: VastDiagnostic[]; }
export async function getAdminMovies(filters: { status?: AdminMovie['status']; q?: string } = {}): Promise<AdminMovie[]> {
  const params = new URLSearchParams({ limit: '100' });
  if (filters.status) params.set('status', filters.status);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  return (await get<{ movies: AdminMovie[] }>(`/admin/movies?${params.toString()}`)).movies;
}
export async function createAdminMovie(input: CreateMovieInput): Promise<AdminMovie> { return (await post<CreateMovieInput, { movie: AdminMovie }>('/admin/movies', input)).movie; }
export async function setAdminMovieStatus(id: string, status: 'publish' | 'unpublish'): Promise<AdminMovie> { return (await post<Record<string, never>, { movie: AdminMovie }>(`/admin/movies/${id}/${status}`, {})).movie; }
export async function getAdminOverview(): Promise<AdminOverviewStats> { return (await get<{ stats: AdminOverviewStats }>('/admin/stats/overview')).stats; }
export async function getAdminUsers(): Promise<AdminUser[]> { return (await get<{ users: AdminUser[] }>('/admin/users')).users; }
export async function updateAdminUser(id: string, patch: { displayName?: string; role?: AdminUser['role']; status?: AdminUser['status'] }): Promise<AdminUser> { return (await put<typeof patch, { user: AdminUser }>(`/admin/users/${id}`, patch)).user; }
export async function getAdminPlans(): Promise<Array<{ id: string; name: string; active: boolean }>> { return (await get<{ plans: Array<{ id: string; name: string; active: boolean }> }>('/plans')).plans; }
export async function grantAdminSubscription(userId: string, planId: string, durationDays = 30): Promise<AdminUserSubscription> { return (await post<{ userId: string; planId: string; durationDays: number }, { subscription: AdminUserSubscription }>('/admin/subscriptions/grant', { userId, planId, durationDays })).subscription; }
export async function revokeAdminSubscription(userId: string): Promise<void> { await post<{ userId: string }, { revoked: boolean }>('/admin/subscriptions/revoke', { userId }); }
export interface AuditLogFilters { q?: string; action?: string; actorId?: string; targetType?: string; from?: string; to?: string; }
function auditQuery(filters: AuditLogFilters = {}): string { const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); }); const query = params.toString(); return query ? `?${query}` : ''; }
export async function getAdminAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> { return (await get<{ logs: AuditLogEntry[] }>(`/admin/audit-logs${auditQuery(filters)}`)).logs; }
export async function downloadAdminAuditCsv(filters: AuditLogFilters = {}): Promise<Blob> { const response = await fetch(`${baseUrl}/admin/audit-logs/export${auditQuery(filters)}`, { credentials: 'include' }); if (!response.ok) throw new Error('Could not export the audit log.'); return response.blob(); }
export async function getAdSettings(): Promise<AdSettings> { return (await get<{ settings: AdSettings }>('/admin/ads/settings')).settings; }
export async function getAdCampaigns(filters: { q?: string; kind?: string; active?: boolean; archived?: boolean; page?: number; limit?: number } = {}): Promise<AdCampaign[]> { const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); }); return (await get<{ campaigns: AdCampaign[] }>(`/admin/ads/campaigns${params.toString() ? `?${params.toString()}` : ''}`)).campaigns; }
export async function getAdCampaignPage(filters: { q?: string; kind?: string; active?: boolean; archived?: boolean; page?: number; limit?: number } = {}): Promise<AdCampaignPage> { const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); }); const response = await get<{ campaigns: AdCampaign[] } & { meta: AdCampaignPage['meta'] }>(`/admin/ads/campaigns${params.toString() ? `?${params.toString()}` : ''}`); return { campaigns: response.campaigns, meta: response.meta }; }
export async function getAdExclusions(): Promise<AdExclusion[]> { return (await get<{ exclusions: AdExclusion[] }>('/admin/ads/exclusions')).exclusions; }
export async function createAdExclusion(input: { scope: AdExclusion['scope']; targetId: string }): Promise<AdExclusion> { return (await post<typeof input, { exclusion: AdExclusion }>('/admin/ads/exclusions', input)).exclusion; }
export async function deleteAdExclusion(id: string): Promise<void> { await del<{ deleted: boolean }>(`/admin/ads/exclusions/${id}`); }
export async function saveAdSettings(settings: AdSettings): Promise<AdSettings> { return (await put<AdSettings, { settings: AdSettings }>('/admin/ads/settings', settings)).settings; }
export async function createAdCampaign(input: Omit<AdCampaign, 'id'>): Promise<AdCampaign> { return (await post<Omit<AdCampaign, 'id'>, { campaign: AdCampaign }>('/admin/ads/campaigns', input)).campaign; }
export async function updateAdCampaign(id: string, patchInput: Partial<Omit<AdCampaign, 'id'>>): Promise<AdCampaign> { return (await patch<Partial<Omit<AdCampaign, 'id'>>, { campaign: AdCampaign }>(`/admin/ads/campaigns/${id}`, patchInput)).campaign; }
export async function deleteAdCampaign(id: string): Promise<void> { await del<{ deleted: boolean }>(`/admin/ads/campaigns/${id}`); }
export async function bulkSetAdCampaignStatus(ids: string[], active: boolean): Promise<string[]> { return (await post<{ ids: string[]; active: boolean }, { updated: string[] }>('/admin/ads/campaigns/bulk-status', { ids, active })).updated; }
export async function duplicateAdCampaign(id: string): Promise<AdCampaign> { return (await post<Record<string, never>, { campaign: AdCampaign }>(`/admin/ads/campaigns/${id}/duplicate`, {})).campaign; }
export async function archiveAdCampaign(id: string): Promise<AdCampaign> { return (await post<Record<string, never>, { campaign: AdCampaign }>(`/admin/ads/campaigns/${id}/archive`, {})).campaign; }
function adReportQuery(filters: AdReportFilters = {}): string { const params = new URLSearchParams(); if (filters.from) params.set('from', filters.from); if (filters.to) params.set('to', filters.to); const query = params.toString(); return query ? `?${query}` : ''; }
export async function getAdReport(filters: AdReportFilters = {}): Promise<AdReportRow[]> { return (await get<{ report: AdReportRow[] }>(`/admin/ads/report${adReportQuery(filters)}`)).report; }
export async function getAdErrorReport(filters: AdReportFilters = {}): Promise<AdErrorReportRow[]> { return (await get<{ errors: AdErrorReportRow[] }>(`/admin/ads/errors${adReportQuery(filters)}`)).errors; }
export async function downloadAdReportCsv(filters: AdReportFilters = {}): Promise<Blob> { const response = await fetch(`${baseUrl}/admin/ads/report/export${adReportQuery(filters)}`, { credentials: 'include' }); if (!response.ok) throw new Error('Could not export the ad report.'); return response.blob(); }
export async function diagnoseAdVast(id: string): Promise<VastDiagnosticResult> { return (await post<Record<string, never>, { campaignId: string; diagnostics: VastDiagnosticResult }>(`/admin/ads/campaigns/${id}/vast-diagnostics`, {})).diagnostics; }
export async function getAdCreativeStatus(id: string): Promise<AdCreativeStatus | null> { return (await get<{ status: AdCreativeStatus | null }>(`/admin/ads/campaigns/${id}/creative-status`)).status; }
export async function processAdCreative(id: string, retry = false): Promise<AdCreativeStatus> { return (await post<Record<string, never>, { status: AdCreativeStatus }>(`/admin/ads/campaigns/${id}/${retry ? 'process/retry' : 'process'}`, {})).status; }
export async function getHomepagePreview(): Promise<HomeResponse> { return get<HomeResponse>('/home'); }
export interface HomepageVersion { version: number; createdAt: string; payload: HomeResponse; }
export interface AdminHomepage { draft: HomeResponse; published: HomeResponse; versions: HomepageVersion[]; }
export async function getAdminHomepage(): Promise<AdminHomepage> { return get<AdminHomepage>('/admin/homepage'); }
export async function saveAdminHomepageDraft(draft: HomeResponse): Promise<HomeResponse> { return (await put<HomeResponse, { draft: HomeResponse }>('/admin/homepage/draft', draft)).draft; }
export async function publishAdminHomepage(): Promise<HomepageVersion> { return (await post<Record<string, never>, { version: HomepageVersion }>('/admin/homepage/publish', {})).version; }
export async function restoreAdminHomepage(version: number): Promise<HomeResponse> { return (await post<Record<string, never>, { draft: HomeResponse }>(`/admin/homepage/versions/${version}/restore`, {})).draft; }
export interface TotpSetup { secret: string; otpauthUrl: string; user: { totpEnabled?: boolean }; }
export async function setupTotp(): Promise<TotpSetup> { return post<Record<string, never>, TotpSetup>('/auth/totp/setup', {}); }
export async function verifyTotp(code: string): Promise<{ user: { totpEnabled?: boolean } }> { return post<{ code: string }, { user: { totpEnabled?: boolean } }>('/auth/totp/verify', { code }); }
export async function disableTotp(code: string): Promise<{ user: { totpEnabled?: boolean } }> { return post<{ code: string }, { user: { totpEnabled?: boolean } }>('/auth/totp/disable', { code }); }
export interface PlatformSettings { siteName: string; tagline: string; supportEmail: string; timezone: string; allowAnonymousWatch: boolean; sessionTtlSeconds: number; maxConcurrentSessions: number; maintenanceMode: boolean; }
export interface DatabaseBackup { name: string; bytes: number; createdAt: string; }
export async function getPlatformSettings(): Promise<PlatformSettings> { return (await get<{ settings: PlatformSettings }>('/admin/settings/platform')).settings; }
export async function savePlatformSettings(settings: PlatformSettings): Promise<PlatformSettings> { return (await put<PlatformSettings, { settings: PlatformSettings }>('/admin/settings/platform', settings)).settings; }
export async function getDatabaseBackups(): Promise<DatabaseBackup[]> { return (await get<{ backups: DatabaseBackup[] }>('/admin/settings/backups')).backups; }
export async function createDatabaseBackup(): Promise<{ name: string; bytes: number }> { return (await post<Record<string, never>, { backup: { name: string; bytes: number } }>('/admin/settings/backups', {})).backup; }
