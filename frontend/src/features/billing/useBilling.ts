'use client';

import { useEffect, useState } from 'react';
import { billingService, type BillingPlan, type CurrentSubscription } from '@/services/billing';

type AsyncState<T> = { data: T | null; state: 'loading' | 'ready' | 'error'; retry: () => void };

export function useBillingPlans(): AsyncState<BillingPlan[]> {
  const [data, setData] = useState<BillingPlan[] | null>(null);
  const [state, setState] = useState<AsyncState<BillingPlan[]>['state']>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState('loading');
    billingService.getPlans().then((plans) => { if (!cancelled) { setData(plans); setState('ready'); } }).catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [attempt]);
  return { data, state, retry: () => setAttempt((value) => value + 1) };
}

export function useCurrentSubscription(enabled = true): AsyncState<CurrentSubscription> {
  const [data, setData] = useState<CurrentSubscription | null>(null);
  const [state, setState] = useState<AsyncState<CurrentSubscription>['state']>(enabled ? 'loading' : 'ready');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState('loading');
    billingService.getCurrentSubscription().then((subscription) => { if (!cancelled) { setData(subscription); setState('ready'); } }).catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [attempt, enabled]);
  return { data, state, retry: () => setAttempt((value) => value + 1) };
}
