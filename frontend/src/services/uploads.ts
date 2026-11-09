import { MEDIA_TYPES, IMAGE_MAX_BYTES, VIDEO_MAX_BYTES, type MediaKind, type MediaUploadReceipt, type StartMediaUpload } from '@nmedia/contracts';
import { baseUrl, parseResponse } from './apiClient';

export function validateMediaFile(file: File, kind: MediaKind): StartMediaUpload['contentType'] {
  const type = file.type || ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska' } as Record<string, string>)[file.name.split('.').pop()?.toLowerCase() ?? ''];
  if (!MEDIA_TYPES.some((allowed) => allowed === type) || !type.startsWith(`${kind}/`)) throw new Error(kind === 'image' ? 'Choose a JPEG, PNG or WebP image.' : 'Choose an MP4, WebM or MKV movie file.');
  if (file.size === 0 || file.size > (kind === 'image' ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES)) throw new Error(kind === 'image' ? 'Choose a non-empty image up to 10 MB.' : 'Choose a non-empty movie up to 2 GB.');
  return type as StartMediaUpload['contentType'];
}

export async function uploadMedia(file: File, kind: MediaKind, onProgress: (percent: number) => void, signal: AbortSignal): Promise<MediaUploadReceipt> {
  const contentType = validateMediaFile(file, kind);
  const send = async (path: string, init: RequestInit): Promise<Response> => {
    for (let attempt = 0; ; attempt += 1) {
      const response = await fetch(`${baseUrl}${path}`, { ...init, credentials: 'include', signal });
      if (response.status !== 429 || attempt >= 3) return response;
      const seconds = Math.min(60, Math.max(1, Number(response.headers.get('retry-after')) || 10));
      await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(new DOMException('Upload cancelled', 'AbortError')); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, seconds * 1000);
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) abort();
      });
    }
  };
  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await send(path, init);
    return parseResponse<T>(response);
  };
  const start = await request<{ id: string; chunkSize: number }>('/admin/media/uploads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, contentType, kind, size: file.size }),
  });
  const path = `/admin/media/uploads/${start.id}`;
  try {
    for (let offset = 0; offset < file.size;) {
      const chunk = file.slice(offset, offset + start.chunkSize);
      const response = await send(`${path}?offset=${offset}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: chunk });
      const next = await parseResponse<{ offset: number }>(response);
      if (next.offset !== offset + chunk.size) throw new Error('Upload position mismatch. Please choose the file again.');
      offset = next.offset;
      onProgress(Math.floor(offset / file.size * 100));
    }
    const receipt = await request<MediaUploadReceipt>(`${path}/complete`, { method: 'POST' });
    if (receipt.url) receipt.url = new URL(receipt.url, new URL(baseUrl, window.location.href)).href;
    return receipt;
  } catch (error) {
    // Only pending bytes are removed; completed uploads and other users' files are untouched.
    void fetch(`${baseUrl}${path}`, { method: 'DELETE', credentials: 'include', keepalive: true }).catch(() => undefined);
    throw error;
  }
}
