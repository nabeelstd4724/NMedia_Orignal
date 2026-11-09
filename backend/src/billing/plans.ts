import type { Plan } from '../../../contracts/src/index.js';

export interface PlanRepository {
  listActive(): Promise<Plan[]>;
  findById(id: string): Promise<Plan | null>;
}

export class InMemoryPlanRepository implements PlanRepository {
  private readonly plans: Plan[] = [
    { id: 'free', name: 'Free', description: 'Watch the free catalog with ads.', priceCents: 0, currency: 'USD', interval: 'month', accessLevel: 'free_with_ads', active: true },
    { id: 'premium-monthly', name: 'Premium', description: 'Ad-free access to the full catalog.', priceCents: 999, currency: 'USD', interval: 'month', accessLevel: 'premium', active: true },
  ];
  async listActive(): Promise<Plan[]> { return this.plans.filter((plan) => plan.active); }
  async findById(id: string): Promise<Plan | null> { return this.plans.find((plan) => plan.id === id && plan.active) ?? null; }
}
