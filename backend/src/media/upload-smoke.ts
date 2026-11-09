import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildApp } from '../app.js';
import { loadConfig } from '../config/env.js';
import { InMemoryAuthRepository } from '../auth/repository.js';
import { InMemoryAuditRepository } from '../admin/audit.js';
import { LocalUploadStore } from './uploads.js';
import { InMemoryCatalogRepository } from '../catalog/repository.js';
import { UPLOAD_CHUNK_BYTES, IMAGE_MAX_BYTES, type MediaUploadReceipt, type StartMediaUpload } from '../../../contracts/src/index.js';

const root = mkdtempSync(join(process.cwd(), '.upload-test-'));
const config = loadConfig({ NODE_ENV: 'development', LOG_LEVEL: 'silent', MEDIA_ROOT: root, RATE_LIMIT_MAX: '1000' });
const auth = new InMemoryAuthRepository();
const audit = new InMemoryAuditRepository();
const editor = await auth.createUser('uploader@example.test', 'Uploader', 'not-used', 'editor');
const other = await auth.createUser('other@example.test', 'Other editor', 'not-used', 'editor');
const user = await auth.createUser('viewer@example.test', 'Viewer', 'not-used', 'user');
async function headersFor(userId: string) {
  const session = await auth.createSession(userId, Date.now() + 60000);
  return { cookie: `${config.authCookieName}=${session.token}`, origin: 'http://localhost:3000' };
}
const headers = await headersFor(editor.id);
const otherHeaders = await headersFor(other.id);
const viewerHeaders = await headersFor(user.id);
const app = buildApp(config, { authRepository: auth, catalogRepository: new InMemoryCatalogRepository(), auditRepository: audit });
const endpoint = '/api/v1/admin/media/uploads';
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV6kAAAAASUVORK5CYII=', 'base64');
const input: StartMediaUpload = { filename: 'poster.png', kind: 'image', contentType: 'image/png', size: image.length };
async function start(data: StartMediaUpload) {
  const response = await app.inject({ method: 'POST', url: endpoint, headers, payload: data });
  assert.equal(response.statusCode, 201, response.body);
  return response.json().data.id as string;
}
async function send(id: string, bytes: Buffer, offset = 0) {
  return app.inject({ method: 'PUT', url: `${endpoint}/${id}?offset=${offset}`, headers: { ...headers, 'content-type': 'application/octet-stream' }, payload: bytes });
}
async function complete(id: string) { return app.inject({ method: 'POST', url: `${endpoint}/${id}/complete`, headers }); }
try {
  assert.equal((await app.inject({ method: 'POST', url: endpoint, payload: input })).statusCode, 401);
  assert.equal((await app.inject({ method: 'POST', url: endpoint, headers: viewerHeaders, payload: input })).statusCode, 403);
  assert.equal((await app.inject({ method: 'POST', url: endpoint, headers: { cookie: headers.cookie }, payload: input })).statusCode, 403);
  assert.equal((await app.inject({ method: 'POST', url: endpoint, headers, payload: { ...input, size: IMAGE_MAX_BYTES + 1 } })).statusCode, 413);
  assert.equal((await app.inject({ method: 'POST', url: endpoint, headers, payload: { ...input, contentType: 'image/svg+xml' } })).statusCode, 400);
  const id = await start(input);
  assert.equal((await complete(id)).statusCode, 409);
  assert.equal((await send(id, image.subarray(0, 20))).statusCode, 200);
  assert.equal((await send(id, image.subarray(0, 20))).statusCode, 409);
  assert.equal((await app.inject({ method: 'PUT', url: `${endpoint}/${id}?offset=20`, headers: { ...otherHeaders, 'content-type': 'application/octet-stream' }, payload: image.subarray(20) })).statusCode, 404);
  assert.equal((await send(id, image.subarray(20), 20)).statusCode, 200);
  const finished = await complete(id);
  assert.equal(finished.statusCode, 200, finished.body);
  const receipt = finished.json().data as MediaUploadReceipt;
  assert.equal('ownerId' in receipt, false);
  assert.ok(receipt.url);
  const readback = await app.inject({ method: 'GET', url: receipt.url });
  assert.equal(readback.statusCode, 200);
  assert.equal(readback.headers['content-type'], 'image/png');
  assert.equal(readback.headers['x-content-type-options'], 'nosniff');
  assert.deepEqual(readback.rawPayload, image);
  assert.equal(new LocalUploadStore(root).get(id)?.filename, 'poster.png');
  const bad = Buffer.from('<html>this is not a PNG image</html>');
  const badId = await start({ ...input, size: bad.length });
  await send(badId, bad);
  assert.equal((await complete(badId)).statusCode, 415);
  assert.equal((await app.inject({ method: 'GET', url: `/api/v1/media/images/${badId}` })).statusCode, 404);
  const cancelId = await start(input);
  assert.equal((await app.inject({ method: 'DELETE', url: `${endpoint}/${cancelId}`, headers })).statusCode, 200);
  assert.equal((await send(cancelId, image)).statusCode, 404);
  const bigId = await start({ ...input, size: UPLOAD_CHUNK_BYTES + 1 });
  assert.equal((await send(bigId, Buffer.alloc(UPLOAD_CHUNK_BYTES + 1))).statusCode, 413);
  await app.inject({ method: 'DELETE', url: `${endpoint}/${bigId}`, headers });
  // Container-header fixture tests storage/attachment, not video decoding or transcoding.
  const video = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(24)]);
  const videoId = await start({ filename: 'movie.mp4', kind: 'video', contentType: 'video/mp4', size: video.length });
  assert.equal((await send(videoId, video)).statusCode, 200);
  const videoResult = await complete(videoId);
  assert.equal(videoResult.statusCode, 200);
  assert.equal(videoResult.json().data.url, undefined);
  assert.deepEqual(readFileSync(new LocalUploadStore(root).path(videoId)), video);
  assert.equal((await app.inject({ method: 'GET', url: `/api/v1/media/images/${videoId}` })).statusCode, 404);
  const mkv = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(24)]);
  const mkvId = await start({ filename: 'movie.mkv', kind: 'video', contentType: 'video/x-matroska', size: mkv.length });
  assert.equal((await send(mkvId, mkv)).statusCode, 200);
  assert.equal((await complete(mkvId)).statusCode, 200);
  const movieBody = { title: 'Upload test', slug: 'upload-test', synopsis: 'A local test movie.', year: 2026, runtimeMin: 2, ageRating: 'PG', accessLevel: 'free_with_ads', posterUrl: receipt.url, backdropUrl: receipt.url, rating: 7.5, genres: ['Drama'], status: 'draft', videoUploadId: mkvId };
  assert.equal((await app.inject({ method: 'POST', url: '/api/v1/admin/movies', headers: otherHeaders, payload: movieBody })).statusCode, 400);
  const movie = await app.inject({ method: 'POST', url: '/api/v1/admin/movies', headers, payload: movieBody });
  assert.equal(movie.statusCode, 201, movie.body);
  assert.equal(movie.json().data.movie.videoUploadId, mkvId);
  const list = await app.inject({ method: 'GET', url: '/api/v1/admin/movies', headers });
  assert.ok(list.json().data.movies.some((entry: { videoUploadId?: string }) => entry.videoUploadId === mkvId));
  assert.equal((await audit.list()).filter((entry) => entry.action === 'media.upload').length, 3);
  console.info('Upload tests passed: auth/CSRF, image readback, chunk boundaries, signature rejection, cancellation, private video and movie attachment.');
} finally { await app.close(); rmSync(root, { recursive: true, force: true }); }
