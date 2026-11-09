'use client';

import { useCallback, useMemo } from 'react';
import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { MovieCard } from '@/components/movie/MovieCard';
import { CatalogControls } from '@/components/catalog/CatalogControls';
import { useCatalog, type CatalogFilters } from '@/features/catalog/useCatalog';
import { SiteFooter } from '@/components/layout/SiteFooter';

const defaults: CatalogFilters = { query: '', genre: '', access: '', sort: 'popular' };

function BrowseContent() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo<CatalogFilters>(() => ({ query: params.get('q') ?? '', genre: params.get('genre') ?? '', access: params.get('access') ?? '', sort: (params.get('sort') as CatalogFilters['sort']) || defaults.sort }), [params]);
  const { movies, isLoading, error } = useCatalog(filters);
  const updateFilters = useCallback((next: Partial<CatalogFilters>) => {
    const updated = { ...filters, ...next };
    const query = new URLSearchParams();
     Object.entries(updated).forEach(([key, value]) => { if (value && value !== defaults[key as keyof CatalogFilters]) query.set(key === 'query' ? 'q' : key, value); });
    router.replace(`${pathname}${query.toString() ? `?${query}` : ''}`, { scroll: false });
  }, [filters, pathname, router]);

  const activeFilters = [filters.query && { key: 'query', label: `Search: ${filters.query}` }, filters.genre && { key: 'genre', label: filters.genre }, filters.access && { key: 'access', label: filters.access === 'free_with_ads' ? 'Free with ads' : 'Premium' }, filters.sort !== defaults.sort && { key: 'sort', label: filters.sort === 'newest' ? 'Newest first' : 'A–Z' }].filter(Boolean) as { key: keyof CatalogFilters; label: string }[];
  return <><Header /><main className="browse-page"><section className="browse-intro"><p className="kicker"><span className="kicker-line" /> THE NMEDIA LIBRARY</p><h1>Find your <em>next</em> story.</h1><p>Thoughtful films, strange little worlds, and the titles worth staying up for.</p></section><CatalogControls filters={filters} onChange={updateFilters} /><div className="catalog-summary"><p className="result-count" aria-live="polite">{isLoading ? 'Searching the library…' : `${movies.length} ${movies.length === 1 ? 'story' : 'stories'} found`}</p>{activeFilters.length > 0 && <div className="active-filters" aria-label="Active filters">{activeFilters.map((filter) => <button className="filter-chip" key={filter.key} type="button" onClick={() => updateFilters({ [filter.key]: defaults[filter.key] })}>{filter.label}<span aria-hidden="true">×</span></button>)}<button className="clear-filters" type="button" onClick={() => updateFilters(defaults)}>Clear all</button></div>}</div>{error && <p className="preview-note browse-error" role="status">● {error}</p>}{isLoading && <div className="catalog-skeleton-grid" aria-label="Loading catalog">{Array.from({ length: 6 }, (_, index) => <div className="movie-skeleton" key={index} aria-hidden="true"><span className="movie-skeleton-poster" /><span className="movie-skeleton-line" /><span className="movie-skeleton-line short" /></div>)}</div>}{!isLoading && movies.length === 0 && <div className={`empty-state browse-empty${error ? ' browse-error' : ''}`} role={error ? 'alert' : undefined}><strong>{error ? 'The library is taking a breath.' : 'No stories match that signal.'}</strong><span>{error ? 'Check the connection and try again.' : 'Try a different title, genre, or access level.'}</span><button className="text-button" onClick={() => updateFilters(defaults)}>Clear filters ↗</button></div>}{!isLoading && movies.length > 0 && <div className="browse-grid">{movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>}</main><SiteFooter /></>;
}

export default function BrowsePage() {
  return <Suspense fallback={<><Header /><main className="detail-loading"><div className="loading-strip" aria-label="Loading catalog" /></main></>}><BrowseContent /></Suspense>;
}
