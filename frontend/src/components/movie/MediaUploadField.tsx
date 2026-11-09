'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { MediaKind, MediaUploadReceipt } from '@nmedia/contracts';
import { uploadMedia } from '@/services/uploads';

export function MediaUploadField({ label, kind, url, disabled, onUrlChange, onUploaded, onBusyChange }: {
  label: string; kind: MediaKind; url?: string; disabled: boolean;
  onUrlChange?: (url: string) => void;
  onUploaded: (receipt: MediaUploadReceipt) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const id = useId();
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function choose(file?: File) {
    if (!file) return;
    setError(''); setBusy(true); onBusyChange(true); setProgress(0);
    const operation = new AbortController(); controller.current = operation;
    try {
      const receipt = await uploadMedia(file, kind, setProgress, operation.signal);
      setFilename(file.name); setPreview(URL.createObjectURL(file)); setPreviewFailed(false); onUploaded(receipt);
    } catch (cause) {
      setError(operation.signal.aborted ? 'Upload cancelled. You can choose another file.' : cause instanceof Error ? cause.message : 'Upload failed. Please try again.');
    } finally { controller.current = null; setBusy(false); onBusyChange(false); }
  }

  return <fieldset className={`media-upload media-upload-${kind}`} disabled={disabled}>
    <legend>{label}</legend>
    <div className="media-upload-preview">
      {kind === 'image' && (url || preview) && !previewFailed ? <img src={url || preview} alt="" onError={() => setPreviewFailed(true)} />
        : kind === 'image' && (url || preview) ? <div><span aria-hidden="true">▧</span><p>Artwork preview unavailable</p></div>
        : kind === 'video' && preview ? <video src={preview} controls preload="metadata" aria-label="Selected movie preview" />
        : <div><span aria-hidden="true">{kind === 'video' ? '▷' : '▧'}</span><p>{kind === 'video' ? 'The original movie file' : 'Artwork for your movie'}</p></div>}
    </div>
    <label className="media-file-label" htmlFor={id}>Choose from computer</label>
     <input id={id} type="file" accept={kind === 'image' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/webm,video/x-matroska,.mp4,.webm,.mkv'} disabled={disabled || busy} aria-describedby={`${id}-hint`} onChange={(event) => { void choose(event.target.files?.[0]); event.currentTarget.value = ''; }} />
    <small id={`${id}-hint`}>{kind === 'image' ? 'JPEG, PNG or WebP · up to 10 MB' : 'MP4, WebM or MKV · up to 2 GB · stored privately'}</small>
    {kind === 'image' && onUrlChange && <label className="field"><span>Or paste an image URL</span><input type="url" value={url ?? ''} placeholder="https://…" disabled={busy} onChange={(event) => { setPreview(''); setFilename(''); onUrlChange(event.target.value); }} required /></label>}
    {busy && <div className="media-upload-progress" role="status"><progress max={100} value={progress} aria-label={`${label} upload progress`} /><span>{progress === 100 ? 'Validating file…' : `Uploading ${progress}%`}</span><button type="button" className="text-button" onClick={() => controller.current?.abort()}>Cancel upload</button></div>}
    {!busy && filename && <p className="media-upload-success" role="status">Uploaded: {filename}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </fieldset>;
}
