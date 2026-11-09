'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { AdminDataTable } from '@/components/layout/AdminDataTable';
import { downloadAdminAuditCsv, getAdminAuditLogs, type AuditLogFilters } from '@/services/admin';
import type { AuditLogEntry } from '@nmedia/contracts';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const load = useCallback(() => { setState('loading'); getAdminAuditLogs(filters).then((next) => { setLogs(next); setState('ready'); }).catch((cause) => { setMessage(cause instanceof Error ? cause.message : 'Could not load audit logs.'); setState('error'); }); }, [filters]);
  useEffect(() => { load(); }, [load]);
  async function exportCsv() { try { const blob = await downloadAdminAuditCsv(filters); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'nmedia-audit.csv'; link.click(); URL.revokeObjectURL(url); setMessage('Audit CSV exported.'); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Could not export audit logs.'); } }
  return <AdminShell><main className="admin-main"><div className="admin-page-heading"><div><p className="admin-kicker">GOVERNANCE</p><h2>Audit log</h2><p className="admin-muted">Filter, inspect and export immutable administrative events.</p></div><div className="admin-heading-actions"><button className="outline-button" type="button" onClick={load} disabled={state === 'loading'}>Refresh ↻</button><button className="button button-primary" type="button" onClick={() => void exportCsv()}>Export CSV</button></div></div>
    <div className="admin-filter-bar"><label className="field"><span>Search</span><input value={filters.q ?? ''} placeholder="Action, actor, target or metadata" onChange={(event) => setFilters({ ...filters, q: event.target.value })} /></label><label className="field"><span>Action</span><input value={filters.action ?? ''} placeholder="movie.create" onChange={(event) => setFilters({ ...filters, action: event.target.value })} /></label><label className="field"><span>Target type</span><input value={filters.targetType ?? ''} placeholder="movie" onChange={(event) => setFilters({ ...filters, targetType: event.target.value })} /></label><button className="outline-button" type="button" onClick={() => setFilters({})}>Reset</button></div>
    {message && <p className="media-upload-success" role="status">{message}</p>}
    {state === 'loading' && <div className="admin-empty admin-state-card"><p>Loading audit log…</p></div>}
    {state === 'error' && <div className="admin-empty admin-state-card" role="alert"><h3>Audit log unavailable.</h3><p>{message}</p><button className="button button-primary" type="button" onClick={load}>Try again</button></div>}
    {state === 'ready' && <AdminDataTable caption="Administrative audit log" rows={logs} rowKey={(log) => log.id} columns={[{ key: 'action', label: 'Action', render: (log) => log.action }, { key: 'target', label: 'Target', render: (log) => `${log.targetType} · ${log.targetId}` }, { key: 'actor', label: 'Actor', render: (log) => log.actorId }, { key: 'when', label: 'When', render: (log) => new Date(log.createdAt).toLocaleString() }, { key: 'details', label: 'Details', render: (log) => <button className="text-button table-action" type="button" onClick={() => setSelected(log)}>Inspect</button> }]} empty={<div className="admin-empty"><h3>No matching activity.</h3><p>Try a broader filter.</p></div>} />}
    {selected && <div className="admin-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title"><p className="admin-kicker">AUDIT DETAIL</p><h3 id="audit-detail-title">{selected.action}</h3><p>{selected.targetType} · {selected.targetId}</p><dl className="audit-detail-list"><div><dt>Actor</dt><dd>{selected.actorId}</dd></div><div><dt>Created</dt><dd>{new Date(selected.createdAt).toLocaleString()}</dd></div><div><dt>Metadata</dt><dd><pre>{JSON.stringify(selected.metadata ?? {}, null, 2)}</pre></dd></div></dl><button className="outline-button" type="button" onClick={() => setSelected(null)}>Close</button></section></div>}
  </main></AdminShell>;
}
