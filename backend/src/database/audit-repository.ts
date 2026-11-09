import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AuditLogEntry } from '../../../contracts/src/index.js';
import type { AuditFilters, AuditRepository } from '../admin/audit.js';

/** Durable audit storage. Mutation transactions can adopt this boundary without changing route callers. */
export class SQLiteAuditRepository implements AuditRepository {
  private readonly db: Database.Database;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      metadata_json TEXT
    ); CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);`);
  }

  async append(input: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    this.db.prepare('INSERT INTO audit_logs(id,actor_id,action,target_type,target_id,created_at,metadata_json) VALUES (?,?,?,?,?,?,?)').run(
      entry.id, entry.actorId, entry.action, entry.targetType, entry.targetId, entry.createdAt, entry.metadata ? JSON.stringify(entry.metadata) : null,
    );
    return { ...entry, metadata: entry.metadata ? { ...entry.metadata } : undefined };
  }

  async list(filters: AuditFilters = {}): Promise<AuditLogEntry[]> {
    const clauses: string[] = []; const params: unknown[] = [];
    if (filters.action) { clauses.push('action=?'); params.push(filters.action); }
    if (filters.actorId) { clauses.push('actor_id=?'); params.push(filters.actorId); }
    if (filters.targetType) { clauses.push('target_type=?'); params.push(filters.targetType); }
    if (filters.from) { clauses.push('created_at>=?'); params.push(filters.from); }
    if (filters.to) { clauses.push('created_at<=?'); params.push(filters.to); }
    if (filters.q) { clauses.push("(action LIKE ? OR actor_id LIKE ? OR target_type LIKE ? OR target_id LIKE ? OR metadata_json LIKE ?)"); const query = `%${filters.q}%`; params.push(query, query, query, query, query); }
    const rows = this.db.prepare(`SELECT id,actor_id actorId,action,target_type targetType,target_id targetId,created_at createdAt,metadata_json metadataJson FROM audit_logs${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT ?`).all(...params, filters.limit ?? 500) as Array<AuditLogEntry & { metadataJson?: string | null }>;
    return rows.map(({ metadataJson, ...entry }) => ({ ...entry, metadata: metadataJson ? JSON.parse(metadataJson) as Record<string, string> : undefined }));
  }

  close(): void { this.db.close(); }
}
