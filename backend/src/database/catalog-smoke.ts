import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { SQLiteCatalogRepository } from './catalog-repository.js';

const root = mkdtempSync(join(process.cwd(), '.catalog-test-'));
const path = join(root, 'catalog.sqlite');
try {
  const first = new SQLiteCatalogRepository(path);
  const created = await first.create({ slug: 'durable-mkv-title', title: 'Durable MKV Title', synopsis: 'A persisted draft.', year: 2026, runtimeMin: 90, ageRating: 'PG', accessLevel: 'premium', posterUrl: '/poster.png', backdropUrl: '/backdrop.png', rating: 8.2, genres: ['Drama'], status: 'draft', videoUploadId: 'upload-mkv' });
  assert.equal((await first.findBySlug(created.slug))?.videoUploadId, 'upload-mkv');
  first.close();
  const reopened = new SQLiteCatalogRepository(path);
  const readBack = await reopened.findBySlug('durable-mkv-title');
  assert.equal(readBack?.title, 'Durable MKV Title');
  assert.equal((await reopened.listAll({ status: 'draft' })).some((movie) => movie.slug === 'durable-mkv-title'), true);
  assert.equal((await reopened.listAll({ q: 'durable-mkv-title' })).some((movie) => movie.id === readBack?.id), true);
  reopened.close();
  console.info('Durable catalog tests passed: seed, create, close/reopen and movie readback.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
