import Link from 'next/link';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function PrivacyPage() {
  return <><main className="legal-page public-page"><Link className="wordmark" href="/"><span className="wordmark-mark">N</span><span>NMEDIA</span></Link><p className="kicker"><span className="kicker-line" />THE FINE PRINT</p><h1>Privacy, plainly.</h1><p>We use the information needed to run your account, protect playback and improve the NMedia experience. We do not sell personal data.</p><h2>What we keep</h2><p>Account details, viewing history and saved titles are used to provide the service you request. You can ask us to correct or remove your information.</p><h2>Questions</h2><p>For privacy questions, contact the NMedia team through your account support channel.</p></main><SiteFooter /></>;
}
