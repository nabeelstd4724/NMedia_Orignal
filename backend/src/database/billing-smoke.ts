import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { SQLitePlanRepository, SQLiteSubscriptionRepository } from './billing-repositories.js';

const root = mkdtempSync(join(process.cwd(), '.billing-test-'));
const path = join(root, 'billing.sqlite');
try {
  const plans = new SQLitePlanRepository(path);
  const subscriptions = new SQLiteSubscriptionRepository(path);
  assert.equal((await plans.findById('premium-monthly'))?.priceCents, 999);
  await subscriptions.grant('user-1', { planId: 'premium-monthly', currentPeriodEndsAt: Date.now() + 60_000 });
  assert.equal((await subscriptions.findByUserId('user-1'))?.planId, 'premium-monthly');
  assert.equal(await subscriptions.countActive(), 1);
  await subscriptions.grant('user-2', { currentPeriodEndsAt: Date.now() - 1 });
  assert.equal(await subscriptions.countActive(), 1);
  subscriptions.close(); plans.close();
  const reopened = new SQLiteSubscriptionRepository(path);
  assert.equal((await reopened.findByUserId('user-1'))?.status, 'active');
  reopened.close();
  console.info('Durable billing tests passed: seeded plans, subscription expiry, count and readback.');
} finally { rmSync(root, { recursive: true, force: true }); }
