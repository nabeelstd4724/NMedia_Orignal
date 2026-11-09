import type { PlaybackResponse } from '../../../contracts/src/index.js';
import type { CatalogMovie } from '../catalog/repository.js';
import type { SubscriptionRepository } from './repository.js';
import type { AdService } from '../ads/service.js';

export interface EntitlementConfig {
  allowAnonymousWatch: boolean;
  pastDueGraceDays: number;
}

export class EntitlementService {
  constructor(private readonly subscriptions: SubscriptionRepository, private readonly config: EntitlementConfig, private readonly ads?: AdService) {}

  async getPlayback(movie: CatalogMovie, userId: string | null): Promise<PlaybackResponse> {
    const subscription = userId ? await this.subscriptions.findByUserId(userId) : null;
    const now = Date.now();
    const graceUntil = subscription ? subscription.currentPeriodEndsAt + this.config.pastDueGraceDays * 24 * 60 * 60 * 1000 : 0;
    const subscriber = Boolean(subscription && subscription.currentPeriodEndsAt > now && subscription.status === 'active')
      || Boolean(subscription && subscription.status === 'past_due' && graceUntil > now);
    const allowed = movie.accessLevel === 'free_with_ads'
      ? Boolean(userId || this.config.allowAnonymousWatch)
      : Boolean(subscriber);
    const adFree = Boolean(subscriber);
    const sessionKey = userId ?? 'anonymous';
    const settings = this.ads ? await this.ads.settings() : { adsEnabled: true, midrollIntervalMin: 12, skipAfterSec: 5, maxAdsPerSession: 4 };
    const selected = !adFree && this.ads ? await this.ads.select('preroll', sessionKey, { movieId: movie.id, collectionIds: movie.collectionIds }) : null;
    const selectedMidroll = !adFree && this.ads ? await this.ads.select('midroll', sessionKey, { movieId: movie.id, collectionIds: movie.collectionIds }) : null;

    if (!allowed) {
      return {
        movieId: movie.id,
        entitlement: 'paywall',
        resumeSeconds: 0,
        subtitles: [],
        audioTracks: [],
        ads: { enabled: false, preroll: [], midroll: [], skipAfterSec: 0 },
        upgradeUrl: '/plans',
      };
    }

    return {
      movieId: movie.id,
      entitlement: 'allowed',
      resumeSeconds: 0,
      subtitles: [],
      audioTracks: [],
        ads: {
           enabled: !adFree && settings.adsEnabled && (userId !== null || settings.anonymousAdsEnabled !== false),
          preroll: selected ? [selected.tag] : [],
          midroll: selectedMidroll ? [selectedMidroll.tag] : [],
          skipAfterSec: adFree ? 0 : settings.skipAfterSec,
          ...(selected ? { selectedCampaignId: selected.campaignId } : {}),
      },
      ...(adFree ? {} : { upgradeUrl: '/plans' }),
    };
  }
}
