'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { AdminConfirmDialog } from '@/components/layout/AdminConfirmDialog';
import { AdminDataTable } from '@/components/layout/AdminDataTable';
import { AdminMovieForm } from '@/components/movie/AdminMovieForm';
import { getAdminMovies, setAdminMovieStatus, type AdminMovie } from '@/services/admin';
import { useAuth } from '@/features/auth/authStore';

export default function AdminMoviesPage() {
  const { session } = useAuth();
  const [movies, setMovies] = useState<AdminMovie[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [working, setWorking] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<AdminMovie['status'] | ''>('');
  const [pendingStatusChange, setPendingStatusChange] = useState<AdminMovie | null>(null);

  const load = useCallback(() => {
    setState('loading');
    getAdminMovies({ q: query, status: status || undefined }).then((items) => { setMovies(items); setState('ready'); }).catch(() => setState('error'));
  }, [query, status]);
  useEffect(() => { load(); }, [load]);

  async function changeStatus(movie: AdminMovie) {
    setWorking(true); setMessage('');
    try {
      const updated = await setAdminMovieStatus(movie.id, movie.status === 'published' ? 'unpublish' : 'publish');
      setMovies((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage(`${updated.title} is now ${updated.status}.`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Could not change the movie status.'); }
    finally { setWorking(false); }
  }

  function exportCsv() {
    const rows = [['Title', 'Slug', 'Year', 'Access', 'Status', 'Rating', 'Genres'], ...movies.map((movie) => [movie.title, movie.slug, String(movie.year), movie.accessLevel, movie.status, String(movie.rating), movie.genres.join('; ')])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = 'nmedia-movies.csv'; link.click(); URL.revokeObjectURL(link.href);
  }

  const canPublish = session?.user.role === 'super_admin';
  return <AdminShell><main className="admin-main">
    <div className="admin-page-heading"><div><p className="admin-kicker">CONTENT WORKSPACE</p><h2>Movies</h2><p className="admin-muted">Create drafts, attach artwork and upload MP4, WebM or MKV originals.</p></div><div className="admin-heading-actions"><button className="outline-button" type="button" onClick={exportCsv} disabled={!movies.length}>Export CSV</button><button className="button button-primary" type="button" disabled={working} onClick={() => setShowForm((value) => !value)}>{showForm ? 'Close form' : '＋ New movie'}</button></div></div>
    <div className="admin-filter-bar"><label className="field"><span>Search titles</span><input value={query} placeholder="Search by title or synopsis" onChange={(event) => setQuery(event.target.value)} /></label><label className="field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="">All statuses</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="archived">Archived</option></select></label><button type="button" className="outline-button" onClick={() => { setQuery(''); setStatus(''); }}>Reset filters</button></div>
    {message && <p className="media-upload-success" role="status">{message}</p>}
    {showForm && <AdminMovieForm onWorkingChange={setWorking} onCreated={(movie) => { setMovies((current) => [movie, ...current]); setState('ready'); setShowForm(false); setMessage(`${movie.title} was created as a draft${movie.videoUploadId ? ' with a private movie file attached' : ''}.`); }} />}
    {state === 'loading' && <div className="admin-empty admin-state-card"><p>Loading catalog workspace…</p></div>}
    {state === 'error' && <div className="admin-empty admin-state-card" role="alert"><h3>Admin catalog unavailable.</h3><p>Check your connection and admin access.</p><button type="button" className="button button-primary" onClick={load}>Try again</button></div>}
    {state === 'ready' && <AdminDataTable caption="NMedia movies" rows={movies} rowKey={(movie) => movie.id} columns={[{ key: 'title', label: 'Title', render: (movie) => <><strong>{movie.title}</strong><small>{movie.slug}</small></> }, { key: 'access', label: 'Access', render: (movie) => movie.accessLevel === 'premium' ? 'Premium' : 'Free with ads' }, { key: 'status', label: 'Status', render: (movie) => <span className={`status-pill status-${movie.status}`}>{movie.status}</span> }, { key: 'file', label: 'Movie file', render: (movie) => movie.videoUploadId ? 'Original uploaded' : 'Not uploaded' }, { key: 'rating', label: 'Rating', render: (movie) => `★ ${movie.rating}` }, { key: 'year', label: 'Year', render: (movie) => movie.year }, { key: 'actions', label: 'Actions', render: (movie) => canPublish && <button type="button" className="text-button table-action" disabled={working} onClick={() => setPendingStatusChange(movie)}>{movie.status === 'published' ? 'Unpublish' : 'Publish'}</button> }]} empty={<div className="admin-empty"><h3>No titles match these filters.</h3><p>Adjust the filters or choose New movie to create your first draft.</p></div>} />}
    <AdminConfirmDialog open={Boolean(pendingStatusChange)} title={pendingStatusChange?.status === 'published' ? 'Unpublish this title?' : 'Publish this title?'} description={pendingStatusChange?.status === 'published' ? 'The title will leave the published catalog and return to draft.' : 'Only publish after confirming the media and artwork are ready.'} confirmLabel={pendingStatusChange?.status === 'published' ? 'Unpublish' : 'Publish'} onCancel={() => setPendingStatusChange(null)} onConfirm={() => { if (pendingStatusChange) void changeStatus(pendingStatusChange).finally(() => setPendingStatusChange(null)); }} />
  </main></AdminShell>;
}
