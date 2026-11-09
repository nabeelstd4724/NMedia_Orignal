'use client';

import { useEffect, useMemo, useState } from 'react';
import { createAdsService, type AdBeacon } from '@/services/adsService';
import { diagnoseAdVast, type AdCampaign } from '@/services/admin';
import { useAd } from '@/features/playback/useAd';

export function AdSandboxPlayer({ campaign }: { campaign: AdCampaign }) {
  const [events, setEvents] = useState<AdBeacon[]>([]);
  const [resolvedMedia, setResolvedMedia] = useState(campaign.mediaUrl);
  const service = useMemo(() => createAdsService((event) => setEvents((current) => [...current, event])), []);
  const duration = Math.max(1, campaign.durationSec ?? 15);
  const ad = useAd(true, undefined, campaign.id, service, duration);
  useEffect(() => { if (campaign.mediaUrl || campaign.kind !== 'third_party') return; void diagnoseAdVast(campaign.id).then((result) => setResolvedMedia(result.mediaUrls[0])).catch(() => undefined); }, [campaign.id, campaign.kind, campaign.mediaUrl]);
  const media = resolvedMedia;

  return <section className="admin-panel admin-settings" aria-label="Ad sandbox player"><div className="panel-heading"><div><p className="admin-kicker">VIEWER-EQUIVALENT SANDBOX</p><h3>{campaign.name}</h3><p>Test mode · events are sent through the real ad beacon service.</p></div></div><div className="playback-frame ad-sandbox-frame">{media ? <video src={media} controls autoPlay muted playsInline onEnded={() => ad.provider.complete()} onError={() => ad.provider.error()} aria-label={`${campaign.name} creative`} /> : <div className="admin-empty"><p>No playable hosted media is available for this campaign.</p><small>{campaign.vastTagUrl ?? 'Add a hosted creative or VAST tag first.'}</small></div>}<div className="ad-overlay" role="status"><span>AD BREAK · SANDBOX</span><strong>{ad.state.status === 'countdown' ? `Your film starts in ${ad.state.remaining}` : `Ad ${ad.state.status}`}</strong><button type="button" className="ad-skip" onClick={() => ad.provider.skip()} disabled={ad.state.status !== 'countdown' || ad.state.remaining > 1}>Skip ad</button><button type="button" className="ad-click" onClick={() => ad.provider.click()}>Learn more</button></div></div><div className="admin-form-grid"><div><strong>Events fired</strong><ul>{events.map((event, index) => <li key={`${event.event}-${index}`}>{event.event}{event.quartile ? ` · quartile ${event.quartile}` : ''}</li>)}</ul>{events.length === 0 && <p className="admin-muted">No events yet.</p>}</div><div><strong>Campaign payload</strong><dl><div><dt>Creative</dt><dd>{campaign.mediaUrl ?? campaign.vastTagUrl ?? 'Not configured'}</dd></div><div><dt>Duration</dt><dd>{duration}s</dd></div><div><dt>Placement</dt><dd>{campaign.placements.join(', ')}</dd></div></dl></div></div></section>;
}
