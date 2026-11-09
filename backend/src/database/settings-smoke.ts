import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { SQLiteSettingsRepository } from './settings-repository.js';

const root = mkdtempSync(join(process.cwd(), '.settings-test-'));
const path = join(root, 'settings.sqlite');
try {
  const defaults = { siteName: 'NMedia', tagline: 'Default', supportEmail: 'support@example.com', timezone: 'UTC', allowAnonymousWatch: true, sessionTtlSeconds: 3600, maxConcurrentSessions: 3, maintenanceMode: false };
  const first = new SQLiteSettingsRepository(path, defaults);
  await first.save({ ...defaults, siteName: 'Sprint 3 NMedia', maintenanceMode: true });
  first.close();
  const reopened = new SQLiteSettingsRepository(path, defaults);
  const settings = await reopened.get();
  assert.equal(settings.siteName, 'Sprint 3 NMedia');
  assert.equal(settings.maintenanceMode, true);
  reopened.close();
  console.info('Durable settings tests passed: save, close/reopen and policy readback.');
} finally { rmSync(root, { recursive: true, force: true }); }
