'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/layout/AdminShell';
import { ApiClientError } from '@/services/apiClient';
import { getAdminOverview } from '@/services/admin';
import type { AdminOverviewStats } from '@nmedia/contracts';

export default function AdminPage() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null); const [state, setState] = useState<'loading'|'ready'|'error'>('loading');
  const load = () => { setState('loading'); getAdminOverview().then((value) => { setStats(value); setState('ready'); }).catch(() => setState('error')); };
  useEffect(() => { load(); }, []);
  return <AdminShell><main className="admin-main"><div className="admin-page-heading"><div><p className="admin-kicker">WORKSPACE OVERVIEW</p><h2>Dashboard</h2><p className="admin-muted">A live view of the NMedia operation.</p></div><Link className="button button-primary" href="/admin/movies">Manage movies <span aria-hidden="true">↗</span></Link></div>{state === 'loading' && <AdminMessage title="Loading dashboard…" text="Fetching the latest workspace totals." />}{state === 'error' && <AdminMessage title="Dashboard unavailable." text="We couldn’t load workspace totals. Check your permissions and try again." error onRetry={load} />}{state === 'ready' && stats && <><div className="admin-grid">{[['Titles', stats.movies.total, `${stats.movies.published} published`], ['Active subscribers', stats.subscriptions.active, 'Current active plans'], ['Users', stats.users.total, 'Registered accounts'], ['Draft queue', stats.movies.draft, `${stats.movies.scheduled} scheduled`]].map(([label, value, note]) => <article className="stat-card" key={String(label)}><p>{label}</p><strong>{value}</strong><span>{note}</span></article>)}</div><section className="admin-panel"><div className="panel-heading"><div><p className="admin-kicker">CONTENT PULSE</p><h2>Release calendar</h2></div><Link className="outline-button" href="/admin/movies">View all titles ↗</Link></div><div className="admin-empty"><h3>{stats.movies.published ? 'Your catalog is moving.' : 'Your catalog is empty.'}</h3><p>{stats.movies.published ? `${stats.movies.published} titles are currently published.` : 'Create your first title to begin building the catalog.'}</p><Link className="button button-primary" href="/admin/movies">Open movie workspace</Link></div></section></>}</main></AdminShell>;
}

function AdminMessage({ title, text, error = false, onRetry }: { title: string; text: string; error?: boolean; onRetry?: () => void }) { return <div className="admin-empty admin-state-card" role={error ? 'alert' : undefined}>{error && <span className="state-icon state-icon-error" aria-hidden="true">!</span>}{!error && <><span className="loading-strip" /><div className="admin-skeleton-lines" aria-hidden="true"><i /><i /><i /></div></>}<h3>{title}</h3><p>{text}</p>{onRetry && <button className="button button-primary" type="button" onClick={onRetry}>Try again <span aria-hidden="true">↻</span></button>}</div>; }
