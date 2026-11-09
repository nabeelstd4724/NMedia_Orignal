import { randomUUID } from 'node:crypto';
import type { AuditLogEntry } from '../../../contracts/src/index.js';

export interface AuditRepository {
  append(input: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry>;
  list(filters?: AuditFilters): Promise<AuditLogEntry[]>;
}

export interface AuditFilters { q?: string; action?: string; actorId?: string; targetType?: string; from?: string; to?: string; limit?: number; }

export class InMemoryAuditRepository implements AuditRepository {
  private readonly entries: AuditLogEntry[] = [];

  async append(input: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const entry = Object.freeze({ ...input, id: randomUUID(), createdAt: new Date().toISOString(), metadata: input.metadata ? Object.freeze({ ...input.metadata }) : undefined });
    this.entries.push(entry);
    return { ...entry, metadata: entry.metadata ? { ...entry.metadata } : undefined };
  }

  async list(filters: AuditFilters = {}): Promise<AuditLogEntry[]> {
    const query = (filters.q ?? '').toLowerCase();
    return this.entries.filter((entry) => !filters.action || entry.action === filters.action).filter((entry) => !filters.actorId || entry.actorId === filters.actorId).filter((entry) => !filters.targetType || entry.targetType === filters.targetType).filter((entry) => !filters.from || entry.createdAt >= filters.from).filter((entry) => !filters.to || entry.createdAt <= filters.to).filter((entry) => !query || `${entry.action} ${entry.actorId} ${entry.targetType} ${entry.targetId} ${JSON.stringify(entry.metadata ?? {})}`.toLowerCase().includes(query)).slice(0, filters.limit ?? 500).map((entry) => ({ ...entry, metadata: entry.metadata ? { ...entry.metadata } : undefined }));
  }
}
