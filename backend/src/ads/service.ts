import type { AdCampaign, AdEvent, AdPlacement, AdRepository, AdSettings } from './repository.js';

export interface SelectedAd { campaignId: string; tag: string; kind: 'hosted' | 'third_party'; }
export interface AdSelectionContext { movieId?: string; collectionIds?: string[]; }

const escapeXml = (value: string): string => value.replace(/[<>&'"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] ?? character);

export class AdService {
  constructor(private readonly repository: AdRepository) {}
  async settings(): Promise<AdSettings> { return this.repository.getSettings(); }

  async select(placement: AdPlacement, sessionKey: string, context: AdSelectionContext = {}): Promise<SelectedAd | null> {
    const settings = await this.repository.getSettings();
    if (placement === 'preroll' && settings.prerollEnabled === false) return null;
    if (placement === 'midroll' && settings.midrollEnabled === false) return null;
    if (sessionKey === 'anonymous' && settings.anonymousAdsEnabled === false) return null;
    const exclusions = await this.repository.listExclusions();
    if (context.movieId && exclusions.some((item) => item.scope === 'title' && item.targetId === context.movieId)) return null;
    if (context.collectionIds?.some((id) => exclusions.some((item) => item.scope === 'collection' && item.targetId === id))) return null;
    if (!settings.adsEnabled || (await this.repository.countSessionAds(sessionKey)) >= settings.maxAdsPerSession) return null;
    const campaigns = (await this.repository.listCampaigns()).filter((campaign) => this.isEligible(campaign, placement));
    if (!campaigns.length) return settings.fallbackVastTagUrl ? { campaignId: 'fallback', tag: settings.fallbackVastTagUrl, kind: 'third_party' } : null;
    // Stable selection keeps retries for a session deterministic while still honoring priority and weight.
    const highestPriority = Math.max(...campaigns.map((campaign) => campaign.priority));
    const prioritized = campaigns.filter((campaign) => campaign.priority === highestPriority);
    const totalWeight = prioritized.reduce((sum, campaign) => sum + Math.max(0, campaign.weight), 0);
    const hash = this.hash(`${sessionKey}:${placement}`);
    let cursor = totalWeight ? hash % totalWeight : 0;
    const selected = prioritized.find((campaign) => { cursor -= Math.max(0, campaign.weight); return cursor < 0; }) ?? prioritized[0];
    return { campaignId: selected.id, tag: selected.kind === 'third_party' ? selected.vastTagUrl! : `/api/v1/ads/vast/${encodeURIComponent(selected.id)}`, kind: selected.kind };
  }

  async getCampaign(id: string): Promise<AdCampaign | null> { return (await this.repository.listCampaigns()).find((campaign) => campaign.id === id) ?? null; }
  async recordEvent(event: AdEvent): Promise<{ accepted: boolean; duplicate: boolean }> { return this.repository.recordEvent(event); }
  async hasCampaign(id: string): Promise<boolean> { return id === 'fallback' || Boolean(await this.getCampaign(id)); }

  toVast(campaign: AdCampaign): string {
    const duration = campaign.durationSec ?? 15;
    const clock = `00:00:${String(duration).padStart(2, '0')}`;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="4.1"><Ad id="${escapeXml(campaign.id)}"><InLine><AdSystem version="1.0">NMedia</AdSystem><AdTitle>${escapeXml(campaign.name)}</AdTitle><Impression>/api/v1/ads/events</Impression><Creatives><Creative><Linear skipoffset="${escapeXml(String(Math.min(5, duration)))}s"><Duration>${clock}</Duration><VideoClicks><ClickThrough>${escapeXml(campaign.clickThroughUrl ?? '')}</ClickThrough></VideoClicks><MediaFiles><MediaFile type="video/mp4" delivery="progressive">${escapeXml(campaign.mediaUrl ?? '')}</MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>`;
  }
  private isEligible(campaign: AdCampaign, placement: AdPlacement): boolean { const now = Date.now(); return campaign.active && !campaign.archived && campaign.placements.includes(placement) && Date.parse(campaign.startsAt) <= now && Date.parse(campaign.endsAt) >= now; }
  private hash(value: string): number { let hash = 0; for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0; return hash; }
}
