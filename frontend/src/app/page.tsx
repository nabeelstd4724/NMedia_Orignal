'use client';

import { Header } from '@/components/layout/Header';
import { HeroCarousel } from '@/components/layout/HeroCarousel';
import { MovieRow } from '@/components/movie/MovieRow';
import { useHome } from '@/features/catalog/useHome';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function HomePage() {
  const { data, isLoading, error } = useHome();
  if (!data && !isLoading) return <><Header /><main className="public-error-page"><p className="kicker"><span className="kicker-line" />CATALOG NOTICE</p><h1>The library is<br /><em>off-air.</em></h1><p>{error ?? 'We could not load the live catalog.'}</p><a className="button button-primary" href="/browse">Try the library <span>↗</span></a></main><SiteFooter /></>;
  return <><Header /><main><HeroCarousel heroes={data?.heroes?.length ? data.heroes : data?.hero ? [data.hero] : []} /><section className="content-shell">{error && <p className="preview-note">● {error}</p>}{isLoading && <div className="loading-strip" aria-label="Loading catalog" />}{data?.rows.map((row) => <MovieRow key={row.id} title={row.title} items={row.items} />)}</section></main><SiteFooter /></>;
}
