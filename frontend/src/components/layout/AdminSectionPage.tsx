'use client';
import { useEffect, useState } from 'react';
import { AdminShell } from './AdminShell';
import { ApiClientError } from '@/services/apiClient';

export function AdminSectionPage({ title, eyebrow, description, load, render }: { title: string; eyebrow: string; description: string; load: () => Promise<unknown>; render: (data: unknown) => React.ReactNode }) {
  const [state, setState] = useState<'loading'|'ready'|'error'>('loading'); const [data, setData] = useState<unknown>(null); const [message, setMessage] = useState('');
  const fetchData = () => { setState('loading'); load().then((value) => { setData(value); setState('ready'); }).catch((cause) => { setMessage(cause instanceof ApiClientError ? cause.message : 'We could not load this workspace.'); setState('error'); }); };
  useEffect(fetchData, []);
  return <AdminShell><main className="admin-main"><div className="admin-page-heading"><div><p className="admin-kicker">{eyebrow}</p><h2>{title}</h2><p className="admin-muted">{description}</p></div><button className="outline-button" type="button" onClick={fetchData} disabled={state === 'loading'} aria-label={`Refresh ${title}`}>{state === 'loading' ? 'Refreshing…' : 'Refresh ↻'}</button></div>{state === 'loading' && <div className="admin-empty admin-state-card" aria-live="polite"><span className="loading-strip" /><div className="admin-skeleton-lines" aria-hidden="true"><i /><i /><i /></div><p>Loading {title.toLowerCase()}…</p></div>}{state === 'error' && <div className="admin-empty admin-state-card" role="alert"><span className="state-icon state-icon-error" aria-hidden="true">!</span><h3>Workspace unavailable.</h3><p>{message}</p><button className="button button-primary" type="button" onClick={fetchData}>Try again <span aria-hidden="true">↻</span></button></div>}{state === 'ready' && render(data)}</main></AdminShell>;
}
