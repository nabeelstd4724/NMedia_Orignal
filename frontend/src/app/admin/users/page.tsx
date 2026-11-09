'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { AdminConfirmDialog } from '@/components/layout/AdminConfirmDialog';
import { AdminDataTable } from '@/components/layout/AdminDataTable';
import { getAdminPlans, getAdminUsers, grantAdminSubscription, revokeAdminSubscription, updateAdminUser, type AdminUser } from '@/services/admin';

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; active: boolean }>>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const load = useCallback(() => {
    setState('loading');
    Promise.all([getAdminUsers(), getAdminPlans()]).then(([nextUsers, nextPlans]) => { setUsers(nextUsers); setPlans(nextPlans.filter((plan) => plan.active)); setState('ready'); }).catch((cause) => { setMessage(cause instanceof Error ? cause.message : 'Could not load the user directory.'); setState('error'); });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function changeRole(user: AdminUser, role: AdminUser['role']) { setBusyId(user.id); setMessage(''); try { const updated = await updateAdminUser(user.id, { role }); setUsers((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item)); setMessage(`${updated.displayName}'s role was updated.`); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Could not update the role.'); } finally { setBusyId(''); } }
  async function grant(user: AdminUser, planId: string) { if (!planId) return; setBusyId(user.id); setMessage(''); try { const subscription = await grantAdminSubscription(user.id, planId); setUsers((current) => current.map((item) => item.id === user.id ? { ...item, subscription } : item)); setMessage(`${user.displayName} now has ${planId} for 30 days.`); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Could not grant the subscription.'); } finally { setBusyId(''); } }
  async function revoke(userId: string) { setBusyId(userId); setMessage(''); try { await revokeAdminSubscription(userId); setUsers((current) => current.map((item) => item.id === userId ? { ...item, subscription: null } : item)); setMessage('Subscription revoked.'); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Could not revoke the subscription.'); } finally { setBusyId(''); setRevokeId(null); } }

  const filtered = users.filter((user) => `${user.displayName} ${user.email} ${user.role} ${user.status}`.toLowerCase().includes(query.toLowerCase()));
  return <AdminShell><main className="admin-main"><div className="admin-page-heading"><div><p className="admin-kicker">ACCESS CONTROL</p><h2>Users</h2><p className="admin-muted">Manage roles and manual premium access against durable account records.</p></div><button className="outline-button" type="button" onClick={load} disabled={state === 'loading'}>{state === 'loading' ? 'Refreshing…' : 'Refresh ↻'}</button></div>
    <div className="admin-filter-bar"><label className="field"><span>Search users</span><input value={query} placeholder="Name, email or role" onChange={(event) => setQuery(event.target.value)} /></label></div>
    {message && <p className="media-upload-success" role="status">{message}</p>}
    {state === 'loading' && <div className="admin-empty admin-state-card"><p>Loading user directory…</p></div>}
    {state === 'error' && <div className="admin-empty admin-state-card" role="alert"><h3>User directory unavailable.</h3><p>{message}</p><button className="button button-primary" type="button" onClick={load}>Try again</button></div>}
    {state === 'ready' && <AdminDataTable caption="NMedia users" rows={filtered} rowKey={(user) => user.id} columns={[{ key: 'name', label: 'Name', render: (user) => <><strong>{user.displayName}</strong><small>{user.email}</small></> }, { key: 'role', label: 'Role', render: (user) => <select className="admin-inline-select" value={user.role} disabled={busyId === user.id} onChange={(event) => void changeRole(user, event.target.value as AdminUser['role'])}><option value="user">User</option><option value="editor">Editor</option><option value="admin">Admin</option><option value="super_admin">Super admin</option></select> }, { key: 'status', label: 'Status', render: (user) => user.status }, { key: 'subscription', label: 'Subscription', render: (user) => user.subscription ? <><span className="status-pill status-published">{user.subscription.planId ?? 'premium'}</span><small>through {new Date(user.subscription.currentPeriodEndsAt).toLocaleDateString()}</small></> : <span className="admin-muted">Free</span> }, { key: 'actions', label: 'Actions', render: (user) => <div className="admin-inline-actions"><select className="admin-inline-select" defaultValue="" disabled={busyId === user.id} onChange={(event) => { void grant(user, event.target.value); event.currentTarget.value = ''; }}><option value="">Grant plan…</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select>{user.subscription && <button className="text-button table-action" disabled={busyId === user.id} onClick={() => setRevokeId(user.id)} type="button">Revoke</button>}</div> }]} empty={<div className="admin-empty"><h3>No users found.</h3><p>Adjust the search or wait for accounts to be created.</p></div>} />}
    <AdminConfirmDialog open={Boolean(revokeId)} title="Revoke this subscription?" description="Premium access will end immediately and the account will return to the free plan." confirmLabel="Revoke access" onCancel={() => setRevokeId(null)} onConfirm={() => { if (revokeId) void revoke(revokeId); }} />
  </main></AdminShell>;
}
