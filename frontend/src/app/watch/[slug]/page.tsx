'use client';

import Link from 'next/link';
import { use } from 'react';
import { Header } from '@/components/layout/Header';
import { AllowedPlayback, PlaybackError, PlaybackPaywall } from '@/components/playback/PlaybackStates';
import { useMovie } from '@/features/catalog/useMovie';
import { usePlayback } from '@/features/playback/usePlayback';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function WatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const playback = usePlayback(slug);
  const { movie } = useMovie(slug);
  const title = playback.data?.title ?? movie?.title ?? slug.replace(/-/g, ' ');

  return <><Header /><main className="watch-page">
    <Link href={`/movie/${encodeURIComponent(slug)}`} className="back-link watch-return">← Return to title</Link>
    {playback.state === 'loading' && <section className="playback-state"><div className="loading-strip" aria-label="Loading playback" /><p className="loading-note">Preparing your viewing session…</p></section>}
    {playback.state === 'paywall' && <PlaybackPaywall title={title} />}
    {playback.state === 'ready' && playback.data && <AllowedPlayback title={title} slug={slug} data={playback.data} />}
    {playback.state === 'expired' && <PlaybackError kind="expired" message={playback.error} />}
    {playback.state === 'invalid' && <PlaybackError kind="invalid" message={playback.error} />}
    {playback.state === 'error' && <PlaybackError kind="error" message={playback.error} />}
  </main><SiteFooter /></>;
}
