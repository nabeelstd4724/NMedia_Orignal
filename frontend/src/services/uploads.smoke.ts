import assert from 'node:assert/strict';
import { uploadMedia, validateMediaFile } from './uploads';

async function main() {
  assert.equal(validateMediaFile(new File(['test'], 'poster.png', { type: 'image/png' }), 'image'), 'image/png');
  assert.equal(validateMediaFile(new File(['test'], 'film.MP4'), 'video'), 'video/mp4');
  assert.equal(validateMediaFile(new File([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])], 'film.MKV'), 'video'), 'video/x-matroska');
  assert.throws(() => validateMediaFile(new File([], 'empty.png', { type: 'image/png' }), 'image'), /non-empty/);
  assert.throws(() => validateMediaFile(new File(['<svg/>'], 'poster.svg', { type: 'image/svg+xml' }), 'image'), /JPEG/);
  assert.throws(() => validateMediaFile(new File(['movie'], 'film.mp4', { type: 'video/mp4' }), 'image'), /JPEG/);
  const originalFetch = globalThis.fetch;
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { href: 'http://localhost:3000/admin/movies' } } });
  let offset = 0;
  let completionAttempts = 0;
  let rejected = false;
  let cancelled = false;
  const id = '12345678-1234-4234-8234-123456789012';
  const result = (data: unknown) => new Response(JSON.stringify({ data }), { headers: { 'content-type': 'application/json' } });
  globalThis.fetch = async (url, options) => {
    assert.equal(options?.credentials, 'include');
    const path = String(url);
    if (options?.method === 'DELETE') { cancelled = true; return result({ cancelled: true }); }
    if (path.endsWith('/complete')) {
      if (rejected) return new Response(JSON.stringify({ error: { code: 'FILE_TYPE', message: 'Not an image.' } }), { status: 415 });
      if (completionAttempts++ === 0) return new Response('', { status: 429, headers: { 'retry-after': '1' } });
      return result({ id, kind: 'image', filename: 'poster.png', contentType: 'image/png', size: 4, url: `/api/v1/media/images/${id}` });
    }
    if (options?.method === 'POST') { offset = 0; return result({ id, chunkSize: 2 }); }
    assert.equal(options?.method, 'PUT');
    assert.equal(new URL(path).searchParams.get('offset'), String(offset));
    assert.ok(options.body instanceof Blob);
    offset += options.body.size;
    return result({ offset });
  };
  try {
    const progress: number[] = [];
    const file = new File(['test'], 'poster.png', { type: 'image/png' });
    const receipt = await uploadMedia(file, 'image', (value) => progress.push(value), new AbortController().signal);
    assert.deepEqual(progress, [50, 100]);
    assert.equal(receipt.url, `http://localhost:4000/api/v1/media/images/${id}`);
    assert.equal(completionAttempts, 2);
    rejected = true;
    await assert.rejects(uploadMedia(file, 'image', () => undefined, new AbortController().signal), /Not an image/);
    assert.equal(cancelled, true);
    console.info('Upload client tests passed: format/empty checks, chunk offsets, progress, server URL, rate-limit retry and cleanup.');
  } finally {
    globalThis.fetch = originalFetch;
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
