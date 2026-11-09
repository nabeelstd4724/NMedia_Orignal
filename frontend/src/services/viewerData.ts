import type { ContinueWatchingItem, ViewerProgressResponse, WatchlistItem } from '@nmedia/contracts';
import { del, get, post, put, putKeepalive } from './apiClient';

export type HistoryItem = ContinueWatchingItem;

export const viewerData = {
  getWatchlist: async () => (await get<{ movies: WatchlistItem[] }>('/me/watchlist')).movies,
  addToWatchlist: (movieId: string) => post<Record<string, never>, { movieId: string; addedAt: string }>(`/me/watchlist/${encodeURIComponent(movieId)}`, {}),
  removeFromWatchlist: (movieId: string) => del<{ movieId: string; removed: boolean }>(`/me/watchlist/${encodeURIComponent(movieId)}`),
  getHistory: async () => (await get<{ movies: HistoryItem[] }>('/me/continue-watching')).movies,
  saveProgress: (payload: { movieId: string; positionSeconds: number; durationSeconds: number; completed?: boolean }) => put<Omit<typeof payload, 'movieId'>, ViewerProgressResponse>(`/me/progress/${encodeURIComponent(payload.movieId)}`, { positionSeconds: payload.positionSeconds, durationSeconds: payload.durationSeconds, completed: payload.completed }),
  saveProgressOnUnload: (payload: { movieId: string; positionSeconds: number; durationSeconds: number; completed?: boolean }) => putKeepalive(`/me/progress/${encodeURIComponent(payload.movieId)}`, { positionSeconds: payload.positionSeconds, durationSeconds: payload.durationSeconds, completed: payload.completed }),
};
