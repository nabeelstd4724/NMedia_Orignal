'use client';

import { useCallback, useEffect, useState } from 'react';
import { post } from '@/services/apiClient';

export type UserRole = 'user' | 'editor' | 'admin' | 'super_admin';
export interface AuthUser { id: string; email: string; displayName?: string; role?: UserRole; }
export interface AuthSession { user: AuthUser; accessToken?: string; }
type Credentials = { email: string; password: string };
type Registration = Credentials & { displayName: string };

const storageKey = 'nmedia.auth.session';

function readSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(window.localStorage.getItem(storageKey) ?? 'null') as AuthSession | null; } catch { return null; }
}

function saveSession(session: AuthSession | null): void {
  if (typeof window === 'undefined') return;
  if (session) window.localStorage.setItem(storageKey, JSON.stringify(session));
  else window.localStorage.removeItem(storageKey);
}

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => { setSession(readSession()); setIsReady(true); }, []);

  const signIn = useCallback(async (credentials: Credentials) => {
    const nextSession = await post<Credentials, AuthSession>('/auth/login', credentials);
    saveSession(nextSession); setSession(nextSession); return nextSession;
  }, []);
  const register = useCallback(async (input: Registration) => {
    const nextSession = await post<Registration, AuthSession>('/auth/register', input);
    saveSession(nextSession); setSession(nextSession); return nextSession;
  }, []);
  const signOut = useCallback(async () => { await post<Record<string, never>, { loggedOut: boolean }>('/auth/logout', {}); saveSession(null); setSession(null); }, []);

  const refresh = useCallback(async () => {
    const nextSession = await post<Record<string, never>, AuthSession>('/auth/refresh', {});
    saveSession(nextSession); setSession(nextSession); return nextSession;
  }, []);

  return { session, isReady, signIn, register, signOut, refresh };
}
