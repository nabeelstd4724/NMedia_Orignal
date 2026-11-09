import { post } from './apiClient';
import type { AdEvent } from '@/features/playback/adTypes';
export interface AdBeacon { event: AdEvent; movieId?: string; campaignId?: string; placement: 'preroll'; quartile?: number; }
export interface AdService { beacon(payload: AdBeacon): Promise<void>; }
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const sessionKey = typeof window === 'undefined' ? 'server-preview' : (window.sessionStorage.getItem('nmedia.ad.session') ?? (() => { const value = makeId(); window.sessionStorage.setItem('nmedia.ad.session', value); return value; })());
export function createAdsService(onBeacon?: (payload: AdBeacon) => void, sender: typeof post = post): AdService { return { async beacon(payload) { try { if (!payload.campaignId) return; onBeacon?.(payload); await sender('/ads/events', { eventId: makeId(), sessionKey, campaignId: payload.campaignId, event: payload.event === 'quartile' ? 'quartile' : payload.event, occurredAt: new Date().toISOString() }); } catch { /* Analytics must never prevent playback. */ } } }; }
export const adsService = createAdsService();
