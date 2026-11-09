'use client';

import { useEffect, useState } from 'react';
import { ApiClientError, baseUrl, get } from '@/services/apiClient';
import type { MovieSummary } from '@nmedia/contracts';
import type { PlaybackResponse, PlaybackState } from './playbackTypes';

export function usePlayback(slug: string) {
  const [data, setData] = useState<PlaybackResponse | null>(null);
  const [state, setState] = useState<PlaybackState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    setState('loading');

    get<MovieSummary>(`/movies/${encodeURIComponent(slug)}`)
      .then((movie) => get<PlaybackResponse>(`/movies/${encodeURIComponent(movie.id)}/playback`).then((result) => ({ ...result, sourceUrl: absoluteUrl(result.sourceUrl), hlsUrl: absoluteUrl(result.hlsUrl), audioTracks: (result.audioTracks ?? []).map((track) => ({ ...track, url: absoluteUrl(track.url) ?? track.url })), subtitles: result.subtitles.map((track) => ({ ...track, url: absoluteUrl(track.url) ?? track.url })), movieId: movie.id, title: movie.title, posterUrl: movie.posterUrl })))
      .then((result) => {
        if (!active) return;
        setData(result);
        if (result.entitlement === 'paywall') setState('paywall');
        else if (result.entitlement === 'allowed') setState('ready');
        else setState('invalid');
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const apiError = reason instanceof ApiClientError ? reason : null;
        if (apiError?.code === 'PLAYBACK_EXPIRED' || apiError?.status === 410) {
          setState('expired');
          setError(apiError.message);
        } else if (apiError?.code === 'INVALID_PLAYBACK' || apiError?.status === 400 || apiError?.status === 404) {
          setState('invalid');
          setError(apiError.message);
        } else {
          setState('error');
          setError(apiError?.message ?? 'We could not connect to the playback service.');
        }
      });

    return () => { active = false; };
  }, [slug]);

  return { data, state, error };
}

function absoluteUrl(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//u.test(value)) return value;
  const origin = new URL(baseUrl).origin;
  return `${origin}${value.startsWith('/') ? value : `/${value}`}`;
}
