'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/authStore';
import { MovieCard } from '@/components/movie/MovieCard';
import { viewerData, type HistoryItem } from '@/services/viewerData';
import type { MovieSummary } from '@nmedia/contracts';
import { useCurrentSubscription } from '@/features/billing/useBilling';
import type { CurrentSubscription } from '@/services/billing';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Header } from '@/components/layout/Header';

export function ProtectedAccount() {
  const { session, isReady, signOut } = useAuth();
  useEffect(() => { if (isReady && !session) window.location.replace('/login'); }, [isReady, session]);
  if (!isReady || !session) return <><Header /><main className="account-page"><p className="loading-note">Checking your session…</p></main><SiteFooter /></>;
  return <AccountContent sessionName={session.user.displayName ?? session.user.email.split('@')[0]} signOut={signOut} />;
}

function AccountContent({ sessionName, signOut }: { sessionName: string; signOut: () => Promise<void> }) {
  const [watchlist, setWatchlist] = useState<MovieSummary[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const subscription = useCurrentSubscription();

  useEffect(() => {
    Promise.all([viewerData.getWatchlist(), viewerData.getHistory()]).then(([saved, watched]) => { setWatchlist(saved); setHistory(watched); setState('ready'); }).catch(() => setState('error'));
  }, []);

  return <><Header /><main className="account-page">
    <div className="account-top"><span className="account-kicker">MEMBER SPACE</span><button className="text-button" type="button" onClick={() => void signOut()}>Sign out</button></div>
    <section className="account-card"><p className="kicker"><span className="kicker-line" />YOUR ACCOUNT</p><h1>Welcome back, {sessionName}.</h1><p className="account-placeholder">Keep the stories you want close, and pick up where you left off.</p><nav className="account-nav" aria-label="Account sections"><a href="#subscription">Subscription</a><a href="#continue">Continue watching</a><a href="#watchlist">Watchlist</a><a href="#history">History</a></nav></section>
    <section className="account-content">
      <SubscriptionStatus subscription={subscription.data} state={subscription.state} onRetry={subscription.retry} />
      {state === 'loading' && <section className="account-loading" aria-label="Loading your viewing space"><div className="catalog-skeleton-grid">{Array.from({ length: 6 }, (_, index) => <div className="movie-skeleton" key={index} aria-hidden="true"><span className="movie-skeleton-poster" /><span className="movie-skeleton-line" /><span className="movie-skeleton-line short" /></div>)}</div></section>}
      {state === 'error' && <p className="empty-state" role="alert"><strong>We couldn’t load your library.</strong><span>Refresh the page and try again.</span></p>}
      {state === 'ready' && <>
        <AccountRow id="continue" title="Continue watching">{history.length ? history.slice(0, 4).map((item) => <article className="continue-card" key={item.id}><MovieCard movie={item} /><Link className="continue-link" href={`/watch/${encodeURIComponent(item.slug)}`}>Resume · {Math.floor(item.progress.positionSeconds / 60)} min in</Link></article>) : <p className="empty-state">Nothing in progress yet. Start a film and we’ll remember your place.</p>}</AccountRow>
        <AccountRow id="watchlist" title="Your watchlist">{watchlist.length ? watchlist.map((movie) => <MovieCard key={movie.id} movie={movie} />) : <p className="empty-state">Your watchlist is waiting for a first favorite. Save titles from their detail page.</p>}</AccountRow>
        <AccountRow id="history" title="Recently watched">{history.length ? history.map((item) => <MovieCard key={item.id} movie={item} />) : <p className="empty-state">Your viewing history will appear here.</p>}</AccountRow>
      </>}
    </section>
  </main><SiteFooter /></>;
}

function SubscriptionStatus({ subscription, state, onRetry }: { subscription: CurrentSubscription | null; state: 'loading' | 'ready' | 'error'; onRetry: () => void }) {
  return <section className="subscription-card" id="subscription" aria-labelledby="subscription-title"><div><p className="kicker"><span className="kicker-line" />YOUR PLAN</p><h2 id="subscription-title">{subscription ? subscription.planId : 'Free viewing'}</h2>{state === 'loading' && <p className="subscription-note" aria-live="polite">Checking your subscription…</p>}{state === 'error' && <p className="subscription-note" role="alert">We couldn’t verify your subscription status. <button className="text-button" type="button" onClick={onRetry}>Try again</button></p>}{state === 'ready' && !subscription && <p className="subscription-note">No active subscription is recorded for this account.</p>}{state === 'ready' && subscription && <p className="subscription-note">Status: <strong>{subscription.status}</strong>{subscription.currentPeriodEndsAt ? ` · Through ${new Date(subscription.currentPeriodEndsAt).toLocaleDateString()}` : ''}</p>}</div><Link className="button button-secondary" href="/pricing">View plans <span aria-hidden="true">↗</span></Link></section>;
}

function AccountRow({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="account-row"><div className="section-heading"><h2>{title}</h2></div><div className="account-grid">{children}</div></section>;
}
