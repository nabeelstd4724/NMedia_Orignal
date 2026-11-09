import Link from 'next/link';

export function SiteFooter() {
  return <footer className="site-footer public-footer">
    <div className="footer-brand"><Link className="wordmark" href="/" aria-label="NMedia home"><span className="wordmark-mark">N</span><span>NMEDIA</span></Link><p>Stories with a pulse.</p></div>
    <nav className="footer-nav" aria-label="Footer navigation">
      <Link href="/browse">Browse</Link>
      <Link href="/pricing">Plans</Link>
      <Link href="/account">Account</Link>
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
    </nav>
    <p className="footer-meta">© 2026 NMedia · Made for the after-hours</p>
  </footer>;
}
