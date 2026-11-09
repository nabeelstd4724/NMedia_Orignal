import Link from 'next/link';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function TermsPage() {
  return <><main className="legal-page public-page"><Link className="wordmark" href="/"><span className="wordmark-mark">N</span><span>NMEDIA</span></Link><p className="kicker"><span className="kicker-line" />THE FINE PRINT</p><h1>Terms of the story.</h1><p>Use NMedia for personal viewing, keep your account secure and respect the rights attached to the films you watch.</p><h2>Memberships</h2><p>Plans, access levels and playback availability are shown before you choose a title. We will not charge you without a clear confirmation step.</p><h2>Good conduct</h2><p>Do not share credentials, interfere with playback or use the service to infringe another person’s rights.</p></main><SiteFooter /></>;
}
