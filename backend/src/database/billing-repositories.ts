import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Plan } from '../../../contracts/src/index.js';
import type { PlanRepository } from '../billing/plans.js';
import type { SubscriptionRecord, SubscriptionRepository, SubscriptionStatus } from '../entitlement/repository.js';

export class SQLitePlanRepository implements PlanRepository {
  private readonly db: Database.Database;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, price_cents INTEGER NOT NULL, currency TEXT NOT NULL, interval TEXT NOT NULL, access_level TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);`);
    const count = (this.db.prepare('SELECT COUNT(*) count FROM plans').get() as { count: number }).count;
    if (count === 0) {
      const insert = this.db.prepare('INSERT INTO plans(id,name,description,price_cents,currency,interval,access_level,active) VALUES (?,?,?,?,?,?,?,?)');
      insert.run('free', 'Free', 'Watch the free catalog with ads.', 0, 'USD', 'month', 'free_with_ads', 1);
      insert.run('premium-monthly', 'Premium', 'Ad-free access to the full catalog.', 999, 'USD', 'month', 'premium', 1);
    }
  }
  private map(row: { id: string; name: string; description: string; priceCents: number; currency: string; interval: 'month' | 'year'; accessLevel: 'free_with_ads' | 'premium'; active: number } | undefined): Plan | null { return row ? { ...row, active: Boolean(row.active) } : null; }
  async listActive(): Promise<Plan[]> { return (this.db.prepare('SELECT id,name,description,price_cents priceCents,currency,interval,access_level accessLevel,active FROM plans WHERE active=1 ORDER BY price_cents').all() as Parameters<SQLitePlanRepository['map']>[0][]).map((row) => this.map(row)!); }
  async findById(id: string): Promise<Plan | null> { return this.map(this.db.prepare('SELECT id,name,description,price_cents priceCents,currency,interval,access_level accessLevel,active FROM plans WHERE id=? AND active=1').get(id) as Parameters<SQLitePlanRepository['map']>[0]); }
  close(): void { this.db.close(); }
}

export class SQLiteSubscriptionRepository implements SubscriptionRepository {
  private readonly db: Database.Database;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`CREATE TABLE IF NOT EXISTS subscriptions (user_id TEXT PRIMARY KEY, status TEXT NOT NULL, current_period_ends_at INTEGER NOT NULL, plan_id TEXT NOT NULL DEFAULT 'premium-monthly', source TEXT NOT NULL DEFAULT 'manual', updated_at TEXT NOT NULL);`);
  }
  async findByUserId(userId: string): Promise<SubscriptionRecord | null> {
    const row = this.db.prepare('SELECT user_id userId,status,current_period_ends_at currentPeriodEndsAt,plan_id planId,source FROM subscriptions WHERE user_id=?').get(userId) as SubscriptionRecord | undefined;
    return row ? { ...row } : null;
  }
  async grant(userId: string, options: { status?: SubscriptionStatus; currentPeriodEndsAt?: number; planId?: string; source?: 'manual' | 'provider' } = {}): Promise<SubscriptionRecord> {
    const record: SubscriptionRecord = { userId, status: options.status ?? 'active', currentPeriodEndsAt: options.currentPeriodEndsAt ?? Date.now() + 30 * 24 * 60 * 60 * 1000, planId: options.planId ?? 'premium-monthly', source: options.source ?? 'manual' };
    this.db.prepare('INSERT INTO subscriptions(user_id,status,current_period_ends_at,plan_id,source,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET status=excluded.status,current_period_ends_at=excluded.current_period_ends_at,plan_id=excluded.plan_id,source=excluded.source,updated_at=excluded.updated_at').run(record.userId, record.status, record.currentPeriodEndsAt, record.planId, record.source, new Date().toISOString());
    return record;
  }
  async revoke(userId: string): Promise<void> { this.db.prepare('DELETE FROM subscriptions WHERE user_id=?').run(userId); }
  async countActive(): Promise<number> { return (this.db.prepare("SELECT COUNT(*) count FROM subscriptions WHERE status='active' AND current_period_ends_at>?").get(Date.now()) as { count: number }).count; }
  close(): void { this.db.close(); }
}
