'use client';

import { useEffect, useState } from 'react';
import type { HomeResponse } from '@nmedia/contracts';
import { featuredHome } from '@/domain/catalog';
import { get } from '@/services/apiClient';

export function useHome() {
  const [data, setData] = useState<HomeResponse | null>(process.env.NODE_ENV === 'production' ? null : featuredHome);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    get<HomeResponse>('/home').then((home) => { if (active) setData({ ...home, heroes: home.heroes?.length ? home.heroes : [home.hero] }); }).catch(() => {
      if (active) setError(process.env.NODE_ENV === 'production' ? 'The live library is unavailable right now.' : 'Preview mode: the live library is unavailable, so local sample titles are shown.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { data, isLoading, error };
}
