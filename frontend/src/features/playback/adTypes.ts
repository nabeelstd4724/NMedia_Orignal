export type AdEvent = 'impression' | 'quartile' | 'complete' | 'skip' | 'click' | 'error';
export type AdState = { status: 'disabled' } | { status: 'countdown'; remaining: number; duration: number; quartiles: number[] } | { status: 'complete' } | { status: 'skipped' } | { status: 'error' };
export type AdAction = { type: 'TICK' } | { type: 'SKIP' } | { type: 'COMPLETE' } | { type: 'ERROR' };
export interface AdProvider { initialize(): void; tick(): void; skip(): void; click(): void; complete(): void; error(): void; dispose(): void; }
export const AD_DURATION_SECONDS = 5;
export function createAdState(enabled: boolean, duration = AD_DURATION_SECONDS): AdState { return enabled ? { status: 'countdown', remaining: duration, duration, quartiles: [] } : { status: 'disabled' }; }
export function adReducer(state: AdState, action: AdAction): AdState {
  if (state.status !== 'countdown') return state;
  if (action.type === 'SKIP') return { status: 'skipped' };
  if (action.type === 'ERROR') return { status: 'error' };
  if (action.type === 'COMPLETE' || state.remaining <= 1) return { status: 'complete' };
  const remaining = state.remaining - 1;
  const quartile = Math.floor(((state.duration - remaining) / state.duration) * 4);
  const quartiles = quartile > 0 && quartile < 4 && !state.quartiles.includes(quartile) ? [...state.quartiles, quartile] : state.quartiles;
  return { ...state, remaining, quartiles };
}
