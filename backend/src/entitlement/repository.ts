export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export interface SubscriptionRecord {
  userId: string;
  status: SubscriptionStatus;
  currentPeriodEndsAt: number;
  planId?: string;
  source?: 'manual' | 'provider';
}

export interface SubscriptionRepository {
  findByUserId(userId: string): Promise<SubscriptionRecord | null>;
  grant(userId: string, options?: { status?: SubscriptionStatus; currentPeriodEndsAt?: number; planId?: string; source?: 'manual' | 'provider' }): Promise<SubscriptionRecord>;
  revoke(userId: string): Promise<void>;
  countActive(): Promise<number>;
}

/** Temporary storage boundary for billing. Replace with the billing repository in a later phase. */
export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private readonly subscriptions = new Map<string, SubscriptionRecord>();

  async findByUserId(userId: string): Promise<SubscriptionRecord | null> {
    return this.subscriptions.get(userId) ?? null;
  }

  /** Deterministic admin/test grant helper; it is intentionally not an HTTP endpoint. */
  async grant(userId: string, options: { status?: SubscriptionStatus; currentPeriodEndsAt?: number; planId?: string; source?: 'manual' | 'provider' } = {}): Promise<SubscriptionRecord> {
    const record: SubscriptionRecord = {
      userId,
      status: options.status ?? 'active',
      currentPeriodEndsAt: options.currentPeriodEndsAt ?? Date.now() + 30 * 24 * 60 * 60 * 1000,
      planId: options.planId ?? 'premium-monthly',
      source: options.source ?? 'manual',
    };
    this.subscriptions.set(userId, record);
    return record;
  }

  async revoke(userId: string): Promise<void> { this.subscriptions.delete(userId); }
  async countActive(): Promise<number> { return [...this.subscriptions.values()].filter((record) => record.status === 'active' && record.currentPeriodEndsAt > Date.now()).length; }
}
