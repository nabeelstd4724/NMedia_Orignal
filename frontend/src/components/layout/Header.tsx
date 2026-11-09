'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function Header() {
   const [query, setQuery] = useState('');
   const [menuOpen, setMenuOpen] = useState(false);
   const [avatarOpen, setAvatarOpen] = useState(false);
   const pathname = usePathname();
   const router = useRouter();
   const submitSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); router.push(query.trim() ? `/browse?q=${encodeURIComponent(query.trim())}` : '/browse'); setMenuOpen(false); };
   const isActive = (path: string) => path === '/' ? pathname === '/' : pathname.startsWith(path);
     return <header className="site-header public-header">
     <Link className="wordmark" href="/" aria-label="NMedia home"><span className="wordmark-mark">N</span><span>NMEDIA</span></Link>
     <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="primary-nav" onClick={() => setMenuOpen((open) => !open)}><span /><span /><span /><b className="sr-only">Toggle navigation</b></button>
      <nav id="primary-nav" className={`main-nav${menuOpen ? ' is-open' : ''}`} aria-label="Primary navigation"><Link className={isActive('/') ? 'active' : ''} href="/" onClick={() => setMenuOpen(false)}>Home</Link><Link className={isActive('/browse') ? 'active' : ''} href="/browse" onClick={() => setMenuOpen(false)}>Browse</Link><Link className={isActive('/pricing') ? 'active' : ''} href="/pricing" onClick={() => setMenuOpen(false)}>Plans</Link><Link href="/account#watchlist" onClick={() => setMenuOpen(false)}>Watchlist</Link></nav>
       <div className="header-actions"><form className="search-box" onSubmit={submitSearch}><span aria-hidden="true">⌕</span><input aria-label="Search titles" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles" /></form><div className="avatar-menu-wrap"><button className="avatar" type="button" aria-label="Open account menu" aria-expanded={avatarOpen} aria-haspopup="menu" onClick={() => setAvatarOpen((open) => !open)}>AM</button>{avatarOpen && <div className="avatar-menu" role="menu"><Link href="/account" role="menuitem" onClick={() => setAvatarOpen(false)}>Account</Link><Link href="/pricing" role="menuitem" onClick={() => setAvatarOpen(false)}>Plans</Link><Link href="/login" role="menuitem" onClick={() => setAvatarOpen(false)}>Sign in</Link></div>}</div></div>
   </header>;
}
