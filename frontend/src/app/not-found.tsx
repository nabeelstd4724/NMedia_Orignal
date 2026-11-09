import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function NotFound() {
  return <><Header /><main className="detail-missing public-error-page"><p className="kicker"><span className="kicker-line" />404 / SIGNAL LOST</p><h1>That story slipped<br /><em>off the reel.</em></h1><p>We could not find the page you were looking for.</p><Link href="/browse" className="button button-primary">Back to browse <span>↗</span></Link></main><SiteFooter /></>;
}
