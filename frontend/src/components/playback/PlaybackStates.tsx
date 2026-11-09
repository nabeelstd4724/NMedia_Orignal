import Link from 'next/link';
import type { PlaybackResponse } from '@/features/playback/playbackTypes';
import { PlaybackPlayer } from './PlaybackPlayer';
import { useAuth } from '@/features/auth/authStore';
import { useAd } from '@/features/playback/useAd';

export function PlaybackPaywall({ title }: { title: string }) {
  return <section className="playback-state playback-paywall"><p className="kicker"><span className="kicker-line" /> NMEDIA PREMIERE</p><h1>Make room for<br /><em>{title}.</em></h1><p>This title is part of the NMedia premiere collection. Upgrade your membership to keep watching the stories that stay with you.</p><Link className="button button-primary" href="/account">See membership options <span>↗</span></Link></section>;
}

export function PlaybackError({ kind, message }: { kind: 'expired' | 'invalid' | 'error'; message?: string | null }) {
  const heading = kind === 'expired' ? 'This viewing pass has expired.' : kind === 'invalid' ? 'This stream is not available.' : 'The reel is taking a moment.';
  const detail = message ?? (kind === 'expired' ? 'Request a fresh playback session and try again.' : 'Please return to the title and try again.');
  return <section className="playback-state playback-error"><p className="kicker"><span className="kicker-line" /> PLAYBACK NOTICE</p><h1>{heading}</h1><p>{detail}</p><Link className="button button-primary" href="/browse">Back to browse <span>↗</span></Link></section>;
}

export function AllowedPlayback({ title, slug, data }: { title: string; slug: string; data: PlaybackResponse }) {
  const { session } = useAuth();
  // playback.ads.enabled is the entitlement source of truth; subscribers receive false.
  const adsEnabled = Boolean(data.ads?.enabled);
  const ad = useAd(adsEnabled, data.movieId, data.ads.selectedCampaignId);
  return <section className="playback-stage"><div className="playback-title"><p className="kicker"><span className="kicker-line" /> NOW PLAYING</p><h1>{title}</h1><p>{adsEnabled ? 'Free viewing · includes a short ad break' : 'Subscriber viewing · uninterrupted'}</p></div><div className="playback-frame"><PlaybackPlayer src={data.sourceUrl ?? data.hlsUrl} poster={data.posterUrl} title={title} movieId={data.movieId} authenticated={Boolean(session)} adActive={ad.isBlocking} audioTracks={data.audioTracks} subtitles={data.subtitles} />{ad.state.status === 'countdown' && <div className="ad-overlay" role="dialog" aria-label="Advertisement" aria-live="polite"><span>AD BREAK · NMEDIA</span><strong>Your film starts in {ad.state.remaining}</strong><small>Thanks for supporting free cinema on NMedia.</small><button type="button" className="ad-skip" onClick={() => ad.provider.skip()} disabled={ad.state.remaining > 1}>Skip ad</button><button type="button" className="ad-click" onClick={() => ad.provider.click()}>Learn more</button></div>}</div><Link className="back-link playback-back" href={`/movie/${encodeURIComponent(slug)}`}>← Return to title</Link></section>;
}
