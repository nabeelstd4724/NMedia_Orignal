'use client';

import { useEffect, useState } from 'react';
import type { MovieSummary } from '@nmedia/contracts';
import { findFixtureMovie } from '@/domain/catalog';
import { get } from '@/services/apiClient';

export function useMovie(slug: string) {
  const [movie, setMovie] = useState<MovieSummary | undefined>(() => process.env.NODE_ENV === 'production' ? undefined : findFixtureMovie(slug));
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    get<MovieSummary>(`/movies/${encodeURIComponent(slug)}`)
      .then((result) => { if (active) setMovie(result); })
      .catch(() => { if (active) { setMovie(process.env.NODE_ENV === 'production' ? undefined : findFixtureMovie(slug)); setError(process.env.NODE_ENV === 'production' ? 'The title service is unavailable right now.' : 'Preview mode: the live title service is unavailable.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  return { movie, isLoading, error };
}
