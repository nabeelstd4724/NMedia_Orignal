import Link from 'next/link';
import { BillingPlans } from '@/components/billing/BillingPlans';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function PricingPage() {
  return <><main className="pricing-page"><div className="account-top"><Link className="wordmark" href="/"><span className="wordmark-mark">N</span><span>NMEDIA</span></Link><Link className="text-button" href="/account">Your account ↗</Link></div><section className="pricing-intro"><p className="kicker"><span className="kicker-line" />THE NMEDIA EDITION</p><h1>Choose your<br /><em>way in.</em></h1><p>Good stories deserve room to breathe. Compare the ways to experience NMedia, whenever you’re ready.</p></section><section className="pricing-plans" aria-labelledby="plans-title"><div className="section-heading"><h2 id="plans-title">Simple by design</h2><span>NO HIDDEN SCENES</span></div><BillingPlans /></section></main><SiteFooter /></>;
}
