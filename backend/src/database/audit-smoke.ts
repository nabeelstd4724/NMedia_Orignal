import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { SQLiteAuditRepository } from './audit-repository.js';

const root = mkdtempSync(join(process.cwd(), '.audit-test-'));
const path = join(root, 'audit.sqlite');
try {
  const first = new SQLiteAuditRepository(path);
  await first.append({ actorId: 'actor-1', action: 'movie.create', targetType: 'movie', targetId: 'mov-1', metadata: { source: 'smoke' } });
  first.close();
  const reopened = new SQLiteAuditRepository(path);
  const rows = await reopened.list();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].action, 'movie.create');
  assert.equal(rows[0].metadata?.source, 'smoke');
  reopened.close();
  console.info('Durable audit tests passed: append, reopen and metadata readback.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
