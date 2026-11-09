'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { ApiClientError } from '@/services/apiClient';
import { useAuth } from '@/features/auth/authStore';
import { getAdminOverview } from '@/services/admin';

export function AuthForm({ mode }: Readonly<{ mode: 'login' | 'register' }>) {
  const { signIn, register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isRegister = mode === 'register';
  const passwordScore = useMemo(() => [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length, [password]);
  const passwordLabel = passwordScore < 2 ? 'Add length and a number.' : passwordScore < 4 ? 'Getting stronger.' : 'Strong password.';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (isRegister && displayName.trim().length < 2) { setError('Enter a display name with at least 2 characters.'); return; }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); return; }
    if (password.length < 8) { setError('Your password must be at least 8 characters.'); return; }
    if (isRegister && !acceptedTerms) { setError('Please accept the terms and privacy policy to continue.'); return; }
    setIsLoading(true);
    try {
      const session = isRegister ? await register({ displayName: displayName.trim(), email: email.trim(), password }) : await signIn({ email: email.trim(), password });
      let isAdmin = session.user.role === 'super_admin' || session.user.role === 'editor';
      if (!session.user.role) { try { await getAdminOverview(); isAdmin = true; } catch { isAdmin = false; } }
      window.location.assign(isAdmin ? '/admin' : '/account');
    } catch (cause) { setError(cause instanceof ApiClientError ? cause.message : 'We could not complete that request. Try again.'); }
    finally { setIsLoading(false); }
  }

  return <form className="auth-form" onSubmit={submit} noValidate>
    {isRegister && <label className="field"><span>Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required minLength={2} disabled={isLoading} /></label>}
    <label className="field"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required disabled={isLoading} /></label>
    <label className="field password-field"><span>Password</span><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={8} disabled={isLoading} /><button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></label>
    {isRegister && <div className="password-meter" aria-live="polite"><div className="password-meter-bar" aria-hidden="true">{[1, 2, 3, 4].map((level) => <i key={level} className={passwordScore >= level ? 'is-on' : ''} />)}</div><p>{passwordLabel} Use 8+ characters with a number and symbol.</p></div>}
    {isRegister && <label className="terms-check"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} disabled={isLoading} /><span>I agree to the <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.</span></label>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary auth-submit" type="submit" disabled={isLoading}>{isLoading ? 'Connecting…' : isRegister ? 'Create account' : 'Sign in'}<span aria-hidden="true">↗</span></button>
    <p className="auth-switch">{isRegister ? 'Already a member?' : 'New to NMedia?'} <Link href={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
  </form>;
}
