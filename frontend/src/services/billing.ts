import { get } from './apiClient';
import type { Plan as ContractPlan, SubscriptionResponse } from '@nmedia/contracts';

export type BillingPlanId = 'free' | 'premium' | string;
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | string;

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  interval?: 'month' | 'year' | string;
  features: string[];
  popular?: boolean;
}

export interface CurrentSubscription {
  id?: string;
  planId: BillingPlanId;
  status: SubscriptionStatus;
  currentPeriodEndsAt?: string;
  cancelAtPeriodEnd?: boolean;
}

type PlansEnvelope = { plans?: BillingPlan[] } | BillingPlan[];
type SubscriptionEnvelope = { subscription?: CurrentSubscription | null } | CurrentSubscription | null;

function readPlans(payload: PlansEnvelope): BillingPlan[] {
  const plans = Array.isArray(payload) ? payload : payload.plans ?? [];
  return plans.map((plan) => {
    const contractPlan = plan as BillingPlan & Partial<ContractPlan>;
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price ?? (contractPlan.priceCents === undefined ? undefined : contractPlan.priceCents / 100),
      currency: plan.currency ?? contractPlan.currency,
      interval: plan.interval ?? contractPlan.interval,
      features: Array.isArray(plan.features) ? plan.features : contractPlan.accessLevel === 'premium'
        ? ['Ad-free viewing', 'Premium titles', 'Continue watching across devices']
        : ['Free catalog access', 'Ad-supported viewing'],
      popular: plan.popular ?? contractPlan.accessLevel === 'premium',
    };
  });
}

function readSubscription(payload: SubscriptionEnvelope | SubscriptionResponse): CurrentSubscription | null {
  if (!payload) return null;
  const value: CurrentSubscription | import('@nmedia/contracts').SubscriptionView | null = typeof payload === 'object' && 'subscription' in payload
    ? payload.subscription as CurrentSubscription | import('@nmedia/contracts').SubscriptionView | null
    : payload as CurrentSubscription | import('@nmedia/contracts').SubscriptionView;
  if (!value) return null;
  if ('planId' in value) return value as CurrentSubscription;
  return {
    planId: value.plan.id,
    status: value.status,
    currentPeriodEndsAt: value.currentPeriodEndsAt ?? undefined,
  };
}

export const billingService = {
  async getPlans(): Promise<BillingPlan[]> {
    return readPlans(await get<PlansEnvelope>('/plans'));
  },
  async getCurrentSubscription(): Promise<CurrentSubscription | null> {
    const payload = await get<SubscriptionEnvelope | SubscriptionResponse>('/me/subscription');
    return readSubscription(payload);
  },
};
