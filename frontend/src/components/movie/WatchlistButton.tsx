'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/authStore';
import { viewerData } from '@/services/viewerData';

export function WatchlistButton({ movieId, movieSlug = movieId }: { movieId: string; movieSlug?: string }) {
  const { session, isReady } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!session) return;
    viewerData.getWatchlist().then((items) => setSaved(items.some((item) => item.id === movieId))).catch(() => undefined);
  }, [movieId, session]);
  if (!isReady) return <button className="button button-secondary" disabled aria-label="Loading watchlist">Loading…</button>;
  if (!session) return <Link className="button button-secondary" href={`/login?returnTo=/movie/${encodeURIComponent(movieSlug)}`}>Sign in to save</Link>;
  async function toggle() {
    setBusy(true); setError(null);
    try { if (saved) await viewerData.removeFromWatchlist(movieId); else await viewerData.addToWatchlist(movieId); setSaved(!saved); }
    catch { setError('Could not update your watchlist.'); }
    finally { setBusy(false); }
  }
  return <span className="watchlist-control"><button type="button" className="button button-secondary" onClick={toggle} disabled={busy} aria-pressed={saved}>{saved ? '✓ In watchlist' : '+ Watchlist'}</button>{error && <small role="status">{error}</small>}</span>;
}
