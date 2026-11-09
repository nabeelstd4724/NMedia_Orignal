'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MovieSummary } from '@nmedia/contracts';
import { catalogFixture } from '@/domain/catalog';
import { get } from '@/services/apiClient';

type SortOrder = 'popular' | 'newest' | 'alphabetical';
export type CatalogFilters = { query: string; genre: string; access: string; sort: SortOrder };

function unwrapMovies(value: MovieSummary[] | { items?: MovieSummary[]; movies?: MovieSummary[] }): MovieSummary[] {
  if (Array.isArray(value)) return value;
  return value.items ?? value.movies ?? [];
}

function filterFixture(filters: CatalogFilters): MovieSummary[] {
  const query = filters.query.trim().toLowerCase();
  return [...catalogFixture].filter((movie) => {
    const matchesQuery = !query || `${movie.title} ${movie.synopsis} ${movie.genres.join(' ')}`.toLowerCase().includes(query);
    const matchesGenre = !filters.genre || movie.genres.includes(filters.genre);
    const matchesAccess = !filters.access || movie.accessLevel === filters.access;
    return matchesQuery && matchesGenre && matchesAccess;
  }).sort((a, b) => filters.sort === 'newest' ? b.year - a.year : filters.sort === 'alphabetical' ? a.title.localeCompare(b.title) : b.rating - a.rating);
}

export function useCatalog(filters: CatalogFilters) {
  const [movies, setMovies] = useState<MovieSummary[]>(() => process.env.NODE_ENV === 'production' ? [] : filterFixture(filters));
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.genre) params.set('genre', filters.genre);
    if (filters.access) params.set('access', filters.access);
    if (filters.sort) params.set('sort', filters.sort);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    get<MovieSummary[] | { items?: MovieSummary[]; movies?: MovieSummary[] }>(`/movies${filterKey ? `?${filterKey}` : ''}`, { signal: controller.signal })
      .then((result) => { if (active) setMovies(unwrapMovies(result)); })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        if (active) {
          setMovies(process.env.NODE_ENV === 'production' ? [] : filterFixture(filters));
          setError(process.env.NODE_ENV === 'production' ? 'The live library is unavailable right now.' : 'Preview mode: the live library is unavailable, so local sample titles are shown.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [filterKey]);

  return { movies, isLoading, error };
}
