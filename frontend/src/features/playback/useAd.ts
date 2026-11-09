'use client';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { adsService, type AdService } from '@/services/adsService';
import { adReducer, createAdState, type AdProvider } from './adTypes';
export function useAd(enabled: boolean, movieId?: string, campaignId?: string, service: AdService = adsService, duration = 5) {
  const [state, dispatch] = useReducer(adReducer, { enabled, duration }, (initial) => createAdState(initial.enabled, initial.duration));
  const sent = useRef(new Set<string>());
  const beacon = useCallback((event: Parameters<AdService['beacon']>[0]['event'], quartile?: number) => { const key = `${event}:${quartile ?? ''}`; if (sent.current.has(key)) return; sent.current.add(key); void service.beacon({ event, movieId, campaignId, placement: 'preroll', quartile }); }, [campaignId, movieId, service]);
  const provider = useRef<AdProvider>({ initialize: () => beacon('impression'), tick: () => dispatch({ type: 'TICK' }), skip: () => { dispatch({ type: 'SKIP' }); beacon('skip'); }, click: () => beacon('click'), complete: () => dispatch({ type: 'COMPLETE' }), error: () => { dispatch({ type: 'ERROR' }); beacon('error'); }, dispose: () => undefined }).current;
  useEffect(() => { if (!enabled) return; provider.initialize(); return () => provider.dispose(); }, [enabled, provider]);
  useEffect(() => { if (state.status !== 'countdown') return; const timer = window.setInterval(() => provider.tick(), 1000); return () => window.clearInterval(timer); }, [provider, state.status]);
  useEffect(() => { if (state.status === 'countdown') state.quartiles.forEach((quartile) => beacon('quartile', quartile)); if (state.status === 'complete') beacon('complete'); }, [beacon, state]);
  return { state, provider, isBlocking: state.status === 'countdown' };
}
