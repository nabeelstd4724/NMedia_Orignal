'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ADMIN_MODULE_ACCESS, type AdminModule } from '@nmedia/contracts';
import { useAuth, type UserRole } from '@/features/auth/authStore';

const links: Array<{ module: AdminModule; href: string; label: string }> = [
  { module: 'overview', href: '/admin', label: 'Overview' },
  { module: 'movies', href: '/admin/movies', label: 'Movies' },
  { module: 'homepage', href: '/admin/homepage', label: 'Homepage' },
  { module: 'ads', href: '/admin/ads', label: 'Ads' },
  { module: 'users', href: '/admin/users', label: 'Users' },
  { module: 'settings', href: '/admin/settings', label: 'Settings' },
  { module: 'audit', href: '/admin/audit', label: 'Audit' },
];

const IDLE_LIMIT_MS = 30 * 60 * 1000;
const WARNING_MS = 60 * 1000;
const REFRESH_MS = 10 * 60 * 1000;

function canAccess(module: AdminModule, role: UserRole | undefined): boolean {
  return Boolean(role && ADMIN_MODULE_ACCESS[module].includes(role));
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { session, isReady, signOut, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [warning, setWarning] = useState(false);
  const [expired, setExpired] = useState(false);
  const lastActivity = useRef(Date.now());
  const role = session?.user.role;
  const currentModule = useMemo(() => links.find((link) => link.href === pathname)?.module ?? 'overview', [pathname]);
  const visibleLinks = links.filter((link) => canAccess(link.module, role));

  useEffect(() => {
    if (!isReady || !session) return;
    const markActivity = () => { lastActivity.current = Date.now(); setWarning(false); };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));
    const timer = window.setInterval(() => {
      const idleFor = Date.now() - lastActivity.current;
      if (idleFor >= IDLE_LIMIT_MS) {
        setExpired(true);
        void signOut().finally(() => router.replace('/login'));
      } else if (idleFor >= IDLE_LIMIT_MS - WARNING_MS) {
        setWarning(true);
      }
    }, 1000);
    const refreshTimer = window.setInterval(() => { void refresh().catch(() => undefined); }, REFRESH_MS);
    return () => {
      events.forEach((event) => window.removeEventListener(event, markActivity));
      window.clearInterval(timer);
      window.clearInterval(refreshTimer);
    };
  }, [isReady, session, refresh, router, signOut]);

  if (isReady && !session) { router.replace('/login'); return <main className="admin-main"><p className="loading-note">Redirecting to sign in…</p></main>; }
  if (!isReady || !session) return <main className="admin-main"><p className="loading-note">Checking your admin access…</p></main>;
  if (!role || !['editor', 'admin', 'super_admin'].includes(role)) return <main className="admin-main"><div className="admin-empty" role="alert"><h1>Admin access required.</h1><p>Your account does not have staff permissions.</p><Link className="button button-primary" href="/account">Return to account</Link></div></main>;
  if (!canAccess(currentModule, role)) return <main className="admin-main"><div className="admin-empty" role="alert"><h1>Permission required.</h1><p>Your role cannot access this workspace module.</p><Link className="button button-primary" href="/admin">Return to overview</Link></div></main>;

  const name = session.user.displayName ?? session.user.email.split('@')[0];
  const initials = name.slice(0, 2).toUpperCase();
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="wordmark" href="/"><span className="wordmark-mark">N</span><span>NMEDIA</span></Link>
      <div className="admin-sidebar-header"><p className="admin-label">Workspace</p><span className="admin-live"><i aria-hidden="true" />Live</span></div>
      <nav aria-label="Admin navigation">{visibleLinks.map(({ href, label }, index) => <Link className={pathname === href ? 'admin-active' : ''} href={href} key={href} aria-current={pathname === href ? 'page' : undefined}><span className="admin-nav-index">{String(index + 1).padStart(2, '0')}</span><span>{label}</span><span className="admin-nav-arrow" aria-hidden="true">↗</span></Link>)}</nav>
      <div className="admin-sidebar-foot"><span className="admin-foot-rule" />CONTROL ROOM<br /><span>Signed in as {name}</span></div>
    </aside>
    <section className="admin-content">
      <header className="admin-topbar"><div><p className="admin-kicker">NMEDIA CONTROL ROOM <span className="admin-slash">/</span> {pathname === '/admin' ? 'OVERVIEW' : pathname.split('/').pop()?.toUpperCase()}</p><h1>{getGreeting()} {name}.</h1></div><div className="admin-profile-wrap"><button type="button" className="admin-profile" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><b>{initials}</b><span className="admin-profile-name">{name}</span><span aria-hidden="true">⌄</span></button>{menuOpen && <div className="admin-profile-menu" role="menu"><span>{role.replace('_', ' ')}</span><button type="button" onClick={() => { void signOut().finally(() => router.replace('/login')); }}>Sign out</button></div>}</div></header>
      {warning && <div className="admin-session-warning" role="status">Your session will expire in about one minute due to inactivity. Move the pointer or press a key to stay signed in.</div>}
      {expired && <div className="admin-session-warning" role="alert">Your admin session expired. Sign in again to continue.</div>}
      {children}
    </section>
  </div>;
}

function getGreeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}
