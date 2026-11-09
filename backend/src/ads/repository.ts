export type AdPlacement = 'preroll' | 'midroll';
export type AdKind = 'hosted' | 'third_party';

export interface AdSettings {
  adsEnabled: boolean;
  prerollEnabled?: boolean;
  midrollEnabled?: boolean;
  anonymousAdsEnabled?: boolean;
  testMode?: boolean;
  midrollIntervalMin: number;
  skipAfterSec: number;
  maxAdsPerSession: number;
  fallbackVastTagUrl?: string;
}

export type AdExclusionScope = 'title' | 'collection';
export interface AdExclusion { id: string; scope: AdExclusionScope; targetId: string; createdAt: string; }

export interface AdCampaign {
  id: string;
  name: string;
  active: boolean;
  archived?: boolean;
  startsAt: string;
  endsAt: string;
  placements: AdPlacement[];
  priority: number;
  weight: number;
  cpmCents?: number;
  kind: AdKind;
  vastTagUrl?: string;
  mediaUrl?: string;
  clickThroughUrl?: string;
  durationSec?: number;
  creativeUploadId?: string;
  targeting?: { countries?: string[]; genres?: string[] };
  impressionCap?: number;
  frequencyCap?: number;
}

export interface AdEvent {
  eventId: string;
  sessionKey: string;
  campaignId: string;
  event: 'impression' | 'start' | 'quartile' | 'complete' | 'skip' | 'click' | 'error';
  occurredAt: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface AdReportFilters {
  from?: string;
  to?: string;
}

export interface AdReportRow {
  campaignId: string;
  impressions: number;
  starts: number;
  quartiles: number;
  completes: number;
  skips: number;
  clicks: number;
  errors: number;
  completionRate: number;
  clickRate: number;
  uniqueSessions: number;
  cpmCents?: number;
  estimatedSpendCents: number;
}

export interface AdErrorReportRow {
  campaignId: string;
  errorCode: string;
  errors: number;
  lastSeenAt: string;
}

export type AdCreativeProcessingState = 'pending' | 'processing' | 'ready' | 'failed';
export interface AdCreativeStatus {
  campaignId: string;
  status: AdCreativeProcessingState;
  progress: number;
  attempt: number;
  durationSec?: number;
  mediaUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  updatedAt: string;
}

export interface AdRepository {
  getSettings(): Promise<AdSettings>;
  listCampaigns(): Promise<AdCampaign[]>;
  recordEvent(event: AdEvent): Promise<{ accepted: boolean; duplicate: boolean }>;
  countSessionAds(sessionKey: string): Promise<number>;
  report(filters?: AdReportFilters): Promise<AdReportRow[]>;
  errorReport(filters?: AdReportFilters): Promise<AdErrorReportRow[]>;
  getCreativeStatus(campaignId: string): Promise<AdCreativeStatus | null>;
  saveCreativeStatus(status: AdCreativeStatus): Promise<AdCreativeStatus>;
  listExclusions(): Promise<AdExclusion[]>;
  createExclusion(input: Omit<AdExclusion, 'id' | 'createdAt'>): Promise<AdExclusion>;
  deleteExclusion(id: string): Promise<boolean>;
  saveSettings(settings: AdSettings): Promise<AdSettings>;
  createCampaign(input: Omit<AdCampaign, 'id'>): Promise<AdCampaign>;
  updateCampaign(id: string, patch: Partial<Omit<AdCampaign, 'id'>>): Promise<AdCampaign | null>;
  deleteCampaign(id: string): Promise<boolean>;
}

export class InMemoryAdRepository implements AdRepository {
  private readonly events = new Map<string, AdEvent>();
  private readonly creativeStatuses = new Map<string, AdCreativeStatus>();
  private readonly exclusions = new Map<string, AdExclusion>();
  constructor(private settings: AdSettings = {
    adsEnabled: true, prerollEnabled: true, midrollEnabled: true, anonymousAdsEnabled: true, testMode: false, midrollIntervalMin: 12, skipAfterSec: 5, maxAdsPerSession: 4,
    fallbackVastTagUrl: 'https://ads.example.test/fallback.xml',
  }, private readonly campaigns: AdCampaign[] = [
    { id: 'cmp_summer', name: 'Summer Launch', active: true, startsAt: '2020-01-01T00:00:00.000Z', endsAt: '2099-01-01T00:00:00.000Z', placements: ['preroll', 'midroll'], priority: 10, weight: 100, kind: 'hosted', mediaUrl: 'https://cdn.example.test/ads/summer.mp4', clickThroughUrl: 'https://example.test/summer', durationSec: 15 },
  ]) {}

  async getSettings(): Promise<AdSettings> { return { ...this.settings }; }
  async listCampaigns(): Promise<AdCampaign[]> { return this.campaigns.map((campaign) => ({ ...campaign, placements: [...campaign.placements] })); }
  async recordEvent(event: AdEvent): Promise<{ accepted: boolean; duplicate: boolean }> {
    const key = `${event.sessionKey}:${event.eventId}`;
    if (this.events.has(key)) return { accepted: true, duplicate: true };
    this.events.set(key, event);
    return { accepted: true, duplicate: false };
  }
  async countSessionAds(sessionKey: string): Promise<number> { return [...this.events.values()].filter((event) => event.sessionKey === sessionKey && event.event === 'impression').length; }
  async report(filters: AdReportFilters = {}): Promise<AdReportRow[]> {
    const events = [...this.events.values()].filter((event) => (!filters.from || event.occurredAt >= filters.from) && (!filters.to || event.occurredAt <= filters.to));
    const byCampaign = new Map<string, AdReportRow>();
    for (const event of events) {
      const row = byCampaign.get(event.campaignId) ?? { campaignId: event.campaignId, impressions: 0, starts: 0, quartiles: 0, completes: 0, skips: 0, clicks: 0, errors: 0, completionRate: 0, clickRate: 0, uniqueSessions: 0, estimatedSpendCents: 0 };
      if (event.event === 'impression') row.impressions += 1;
      if (event.event === 'start') row.starts += 1;
      if (event.event === 'quartile') row.quartiles += 1;
      if (event.event === 'complete') row.completes += 1;
      if (event.event === 'skip') row.skips += 1;
      if (event.event === 'click') row.clicks += 1;
      if (event.event === 'error') row.errors += 1;
      row.uniqueSessions = new Set(events.filter((candidate) => candidate.campaignId === event.campaignId).map((candidate) => candidate.sessionKey)).size;
      row.completionRate = row.impressions ? row.completes / row.impressions : 0;
      row.clickRate = row.impressions ? row.clicks / row.impressions : 0;
      byCampaign.set(event.campaignId, row);
    }
    const cpmByCampaign = new Map(this.campaigns.map((campaign) => [campaign.id, campaign.cpmCents]));
    return [...byCampaign.values()].map((row) => { const cpmCents = cpmByCampaign.get(row.campaignId); return { ...row, ...(cpmCents !== undefined ? { cpmCents, estimatedSpendCents: Math.round((row.impressions / 1000) * cpmCents) } : {}) }; }).sort((left, right) => right.impressions - left.impressions || left.campaignId.localeCompare(right.campaignId));
  }
  async errorReport(filters: AdReportFilters = {}): Promise<AdErrorReportRow[]> {
    const grouped = new Map<string, AdErrorReportRow>();
    for (const event of this.events.values()) {
      if (event.event !== 'error' || (filters.from && event.occurredAt < filters.from) || (filters.to && event.occurredAt > filters.to)) continue;
      const errorCode = event.errorCode || 'unknown';
      const key = `${event.campaignId}:${errorCode}`;
      const current = grouped.get(key);
      if (current) { current.errors += 1; if (event.occurredAt > current.lastSeenAt) current.lastSeenAt = event.occurredAt; }
      else grouped.set(key, { campaignId: event.campaignId, errorCode, errors: 1, lastSeenAt: event.occurredAt });
    }
    return [...grouped.values()].sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
  }
  async getCreativeStatus(campaignId: string): Promise<AdCreativeStatus | null> { const status = this.creativeStatuses.get(campaignId); return status ? { ...status } : null; }
  async saveCreativeStatus(status: AdCreativeStatus): Promise<AdCreativeStatus> { this.creativeStatuses.set(status.campaignId, { ...status }); return { ...status }; }
  async listExclusions(): Promise<AdExclusion[]> { return [...this.exclusions.values()].map((item) => ({ ...item })); }
  async createExclusion(input: Omit<AdExclusion, 'id' | 'createdAt'>): Promise<AdExclusion> { const existing = [...this.exclusions.values()].find((item) => item.scope === input.scope && item.targetId === input.targetId); if (existing) return { ...existing }; const item = { ...input, id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() }; this.exclusions.set(item.id, item); return { ...item }; }
  async deleteExclusion(id: string): Promise<boolean> { return this.exclusions.delete(id); }
  async saveSettings(settings: AdSettings): Promise<AdSettings> { this.settings = { ...settings }; return this.getSettings(); }
  async createCampaign(input: Omit<AdCampaign, 'id'>): Promise<AdCampaign> { const campaign = { ...input, id: `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` }; this.campaigns.push(campaign); return { ...campaign, placements: [...campaign.placements] }; }
  async updateCampaign(id: string, patch: Partial<Omit<AdCampaign, 'id'>>): Promise<AdCampaign | null> { const campaign = this.campaigns.find((item) => item.id === id); if (!campaign) return null; Object.assign(campaign, patch); return { ...campaign, placements: [...campaign.placements] }; }
  async deleteCampaign(id: string): Promise<boolean> { const index = this.campaigns.findIndex((item) => item.id === id); if (index < 0) return false; this.campaigns.splice(index, 1); return true; }
}
