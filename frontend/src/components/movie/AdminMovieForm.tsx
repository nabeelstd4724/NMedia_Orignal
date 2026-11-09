'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createAdminMovie, type AdminMovie, type CreateMovieInput } from '@/services/admin';
import { MediaUploadField } from './MediaUploadField';

export function AdminMovieForm({ onCreated, onWorkingChange }: {
  onCreated: (movie: AdminMovie) => void; onWorkingChange: (busy: boolean) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({ accessLevel: 'free_with_ads', year: String(new Date().getFullYear()), rating: '0', ageRating: 'Not rated' });
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [videoUploadId, setVideoUploadId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const uploading = Object.values(pending).some(Boolean);
  useEffect(() => { onWorkingChange(saving || uploading); }, [saving, uploading, onWorkingChange]);
  const update = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading || saving) return;
    setSaving(true); setError('');
    try {
      const input: CreateMovieInput = {
        title: values.title?.trim() ?? '', slug: values.slug?.trim() ?? '', synopsis: values.synopsis?.trim() ?? '',
        year: Number(values.year), runtimeMin: Number(values.runtimeMin), ageRating: values.ageRating.trim(),
        accessLevel: values.accessLevel as CreateMovieInput['accessLevel'], posterUrl: values.posterUrl?.trim() ?? '', backdropUrl: values.backdropUrl?.trim() ?? '',
         rating: Number(values.rating), genres: (values.genres ?? '').split(',').map((genre) => genre.trim()).filter(Boolean), collectionIds: (values.collectionIds ?? '').split(',').map((id) => id.trim()).filter(Boolean), status: 'draft', videoUploadId,
      };
      if (!input.genres.length) throw new Error('Add at least one genre.');
      onCreated(await createAdminMovie(input));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create this movie. Your uploaded files are still selected.'); }
    finally { setSaving(false); onWorkingChange(false); }
  }

  return <form className="admin-form" onSubmit={submit}>
    <header className="movie-form-heading"><p className="admin-kicker">01 / MOVIE DETAILS</p><h3>A new story for the library</h3><p>Create a draft, with artwork and an optional original movie file.</p></header>
    <div className="admin-form-grid">
      <label className="field"><span>Title</span><input value={values.title ?? ''} required maxLength={200} disabled={saving} onChange={(event) => update('title', event.target.value)} /></label>
      <label className="field"><span>Slug</span><input value={values.slug ?? ''} placeholder="my-movie-title" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} disabled={saving} onChange={(event) => update('slug', event.target.value)} /></label>
      <label className="field"><span>Synopsis</span><textarea value={values.synopsis ?? ''} required maxLength={2000} rows={4} disabled={saving} onChange={(event) => update('synopsis', event.target.value)} /></label>
       <label className="field"><span>Genres (comma separated)</span><input value={values.genres ?? ''} placeholder="Drama, Adventure" required disabled={saving} onChange={(event) => update('genres', event.target.value)} /></label><label className="field"><span>Collection IDs (comma separated)</span><input value={values.collectionIds ?? ''} placeholder="col_featured, col_awards" disabled={saving} onChange={(event) => update('collectionIds', event.target.value)} /></label>
      {([['year', 'Year', 1888, 2100, 1], ['runtimeMin', 'Runtime (minutes)', 1, 1000, 1], ['rating', 'Rating', 0, 10, 0.1]] as const).map(([key, label, min, max, step]) => <label className="field" key={key}><span>{label}</span><input type="number" value={values[key] ?? ''} min={min} max={max} step={step} required disabled={saving} onChange={(event) => update(key, event.target.value)} /></label>)}
      <label className="field"><span>Age rating</span><input value={values.ageRating} required maxLength={20} disabled={saving} onChange={(event) => update('ageRating', event.target.value)} /></label>
      <label className="field"><span>Access level</span><select value={values.accessLevel} disabled={saving} onChange={(event) => update('accessLevel', event.target.value)}><option value="free_with_ads">Free with ads</option><option value="premium">Premium</option></select></label>
    </div>
    <header className="movie-form-heading"><p className="admin-kicker">02 / ARTWORK & MOVIE FILE</p><h3>Choose files from your computer</h3><p>Images upload immediately and fill in their URLs. Nothing is published until you publish the draft.</p></header>
    <div className="movie-upload-grid">
      {(['posterUrl', 'backdropUrl'] as const).map((key) => <MediaUploadField key={key} label={key === 'posterUrl' ? 'Poster image' : 'Backdrop image'} kind="image" url={values[key]} disabled={saving} onUrlChange={(url) => update(key, url)} onUploaded={(file) => update(key, file.url ?? '')} onBusyChange={(busy) => setPending((current) => ({ ...current, [key]: busy }))} />)}
      <MediaUploadField label="Movie video (optional for a draft)" kind="video" disabled={saving} onUploaded={(file) => setVideoUploadId(file.id)} onBusyChange={(busy) => setPending((current) => ({ ...current, video: busy }))} />
    </div>
    <p className="movie-upload-note">Movie originals are stored privately. Uploading attaches the file to this draft; automatic HLS encoding and public playback of uploaded originals are not connected yet.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary" type="submit" disabled={saving || uploading}>{saving ? 'Saving draft…' : uploading ? 'Wait for uploads…' : 'Create movie draft'}</button>
  </form>;
}
