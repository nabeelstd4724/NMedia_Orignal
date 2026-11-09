import type { PlaybackResponse as ContractPlaybackResponse } from '@nmedia/contracts';

export type PlaybackEntitlement = ContractPlaybackResponse['entitlement'];
export type PlaybackResponse = ContractPlaybackResponse & { movieId?: string; title?: string; posterUrl?: string };

export type PlaybackState = 'loading' | 'ready' | 'paywall' | 'expired' | 'invalid' | 'error';
