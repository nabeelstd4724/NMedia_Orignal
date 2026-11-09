import Link from 'next/link';

export function AuthShell({ children, eyebrow, title, intro }: Readonly<{ children: React.ReactNode; eyebrow: string; title: string; intro: string }>) {
  return <main className="auth-page"><div className="auth-atmosphere" aria-hidden="true" /><section className="auth-panel" aria-labelledby="auth-title">
    <Link className="wordmark auth-wordmark" href="/"><span className="wordmark-mark">N</span><span>NMEDIA</span></Link>
    <div className="auth-copy"><p className="kicker"><span className="kicker-line" />{eyebrow}</p><h1 id="auth-title">{title}</h1><p>{intro}</p></div>
    {children}
    <Link className="auth-home-link" href="/">← Back to home</Link>
  </section><aside className="auth-aside"><p className="auth-aside-kicker">NMEDIA / MEMBERS</p><p className="auth-quote">Stories with a pulse<span>.</span></p><p className="auth-aside-note">Your place for the films that stay with you long after the credits.</p></aside></main>;
}
