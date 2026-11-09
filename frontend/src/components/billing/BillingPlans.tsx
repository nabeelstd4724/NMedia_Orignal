'use client';

import { useState } from 'react';
import { useBillingPlans } from '@/features/billing/useBilling';
import { PaymentsComingSoonDialog } from './PaymentsComingSoonDialog';
import type { BillingPlan } from '@/services/billing';

export function BillingPlans() {
  const plans = useBillingPlans();
  const [dialogOpen, setDialogOpen] = useState(false);
  if (plans.state === 'loading') return <div className="billing-state" aria-live="polite"><span className="loading-strip" />Loading plans…</div>;
  if (plans.state === 'error') return <div className="empty-state billing-state" role="alert"><strong>Plans are taking a moment.</strong><span>We couldn’t reach billing right now.</span><button className="text-button" type="button" onClick={plans.retry}>Try again</button></div>;
  if (!plans.data?.length) return <div className="empty-state billing-state"><strong>Plans are coming soon.</strong><span>There are no plans available yet. Check back soon.</span></div>;
  return <>
    <div className="billing-plan-grid">{plans.data.map((plan) => <PlanCard key={plan.id} plan={plan} onChoose={() => { if (plan.id !== 'free') setDialogOpen(true); }} />)}</div>
    {dialogOpen && <PaymentsComingSoonDialog onClose={() => setDialogOpen(false)} />}
  </>;
}

function PlanCard({ plan, onChoose }: { plan: BillingPlan; onChoose: () => void }) {
  const isFree = plan.id === 'free';
  const price = plan.price === undefined ? '—' : plan.price === 0 ? 'Free' : `${plan.currency ?? '$'}${plan.price}`;
  return <article className={`billing-plan-card${plan.popular ? ' billing-plan-featured' : ''}`}>
    {plan.popular && <span className="billing-plan-ribbon">MOST LOVED</span>}
    <p className="billing-plan-label">{isFree ? 'THE ESSENTIALS' : 'THE FULL PICTURE'}</p><h3>{plan.name}</h3>
    <p className="billing-plan-description">{plan.description ?? (isFree ? 'A thoughtful way to start watching.' : 'More cinema, fewer interruptions.')}</p>
    <p className="billing-plan-price"><strong>{price}</strong>{plan.interval && price !== 'Free' && <span> / {plan.interval}</span>}</p>
    <ul className="billing-feature-list">{plan.features.map((feature) => <li key={feature}><span aria-hidden="true">+</span>{feature}</li>)}</ul>
    <button className={`button ${isFree ? 'button-secondary' : 'button-primary'}`} type="button" onClick={onChoose} disabled={isFree} aria-disabled={isFree}>{isFree ? 'Current starting point' : 'Choose premium'}{!isFree && <span aria-hidden="true">↗</span>}</button>
  </article>;
}
