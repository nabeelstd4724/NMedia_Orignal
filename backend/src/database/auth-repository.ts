import Database from 'better-sqlite3';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { normalizeAccountRole, type AccountRole, type AuthRepository, type SessionRecord, type UserRecord } from '../auth/repository.js';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

/** Durable SQLite auth store. Tokens are only ever stored as SHA-256 digests. */
export class SQLiteAuthRepository implements AuthRepository {
  private readonly db: Database.Database;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, role TEXT NOT NULL, totp_secret TEXT, totp_enabled INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), family_id TEXT NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER, replaced_by TEXT);
      CREATE INDEX IF NOT EXISTS sessions_family_idx ON sessions(family_id);`);
    try { this.db.exec('ALTER TABLE users ADD COLUMN totp_secret TEXT'); } catch { /* already present */ }
    try { this.db.exec('ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0'); } catch { /* already present */ }
  }
  private mapUser(row: (UserRecord & { totpEnabled?: number }) | undefined): UserRecord | null { return row ? { ...row, role: normalizeAccountRole(row.role), totpEnabled: Boolean(row.totpEnabled), totpSecret: row.totpSecret ?? null } : null; }
  findUserByEmail(email: string): Promise<UserRecord | null> { return Promise.resolve(this.mapUser(this.db.prepare('SELECT id,email,display_name displayName,password_hash passwordHash,status,created_at createdAt,role,totp_secret totpSecret,totp_enabled totpEnabled FROM users WHERE email=?').get(email) as UserRecord & { totpEnabled?: number } | undefined)); }
  findUserById(id: string): Promise<UserRecord | null> { return Promise.resolve(this.mapUser(this.db.prepare('SELECT id,email,display_name displayName,password_hash passwordHash,status,created_at createdAt,role,totp_secret totpSecret,totp_enabled totpEnabled FROM users WHERE id=?').get(id) as UserRecord & { totpEnabled?: number } | undefined)); }
  createUser(email: string, displayName: string, passwordHash: string, role: AccountRole = 'user'): Promise<UserRecord> {
    const user: UserRecord = { id: randomUUID(), email, displayName, passwordHash, status: 'active', createdAt: new Date().toISOString(), role };
    this.db.prepare('INSERT INTO users(id,email,display_name,password_hash,status,created_at,role,totp_secret,totp_enabled) VALUES (?,?,?,?,?,?,?,?,?)').run(user.id, user.email, user.displayName, user.passwordHash, user.status, user.createdAt, user.role, null, 0);
    return Promise.resolve(user);
  }
  createSession(userId: string, expiresAt: number): Promise<SessionRecord> { return Promise.resolve(this.insertSession(userId, expiresAt, randomUUID())); }
  private insertSession(userId: string, expiresAt: number, familyId: string): SessionRecord {
    const token = randomBytes(32).toString('base64url');
    this.db.prepare('INSERT INTO sessions(token_hash,user_id,family_id,expires_at) VALUES (?,?,?,?)').run(digest(token), userId, familyId, expiresAt);
    return { token, userId, expiresAt, familyId };
  }
  findSession(token: string): Promise<SessionRecord | null> {
    const row = this.db.prepare('SELECT token_hash tokenHash,user_id userId,family_id familyId,expires_at expiresAt,revoked_at revokedAt FROM sessions WHERE token_hash=?').get(digest(token)) as (SessionRecord & { tokenHash: string; revokedAt?: number }) | undefined;
    if (!row || row.expiresAt <= Date.now() || row.revokedAt) return Promise.resolve(null);
    return Promise.resolve({ token, userId: row.userId, expiresAt: row.expiresAt, familyId: row.familyId });
  }
  rotateSession(token: string, expiresAt: number): Promise<SessionRecord | null> {
    const tx = this.db.transaction(() => {
      const row = this.db.prepare('SELECT user_id userId,family_id familyId,expires_at expiresAt,revoked_at revokedAt FROM sessions WHERE token_hash=?').get(digest(token)) as { userId: string; familyId: string; expiresAt: number; revokedAt?: number } | undefined;
      if (!row || row.expiresAt <= Date.now()) return null;
      if (row.revokedAt) { this.db.prepare('UPDATE sessions SET revoked_at=? WHERE family_id=? AND revoked_at IS NULL').run(Date.now(), row.familyId); return null; }
      const next = this.insertSession(row.userId, expiresAt, row.familyId);
      this.db.prepare('UPDATE sessions SET revoked_at=?,replaced_by=? WHERE token_hash=?').run(Date.now(), digest(next.token), digest(token));
      return next;
    });
    return Promise.resolve(tx());
  }
  deleteSession(token: string): Promise<void> { this.db.prepare('UPDATE sessions SET revoked_at=? WHERE token_hash=?').run(Date.now(), digest(token)); return Promise.resolve(); }
  countUsers(): Promise<number> { return Promise.resolve((this.db.prepare('SELECT COUNT(*) count FROM users').get() as { count: number }).count); }
  listUsers(): Promise<UserRecord[]> { return Promise.resolve((this.db.prepare('SELECT id,email,display_name displayName,password_hash passwordHash,status,created_at createdAt,role,totp_secret totpSecret,totp_enabled totpEnabled FROM users').all() as Array<UserRecord & { totpEnabled?: number }>).map((user) => this.mapUser(user)!)); }
  updateUser(id: string, patch: Partial<Pick<UserRecord, 'displayName' | 'role' | 'status'>>): Promise<UserRecord | null> {
    const current = this.mapUser(this.db.prepare('SELECT id,email,display_name displayName,password_hash passwordHash,status,created_at createdAt,role,totp_secret totpSecret,totp_enabled totpEnabled FROM users WHERE id=?').get(id) as UserRecord & { totpEnabled?: number } | undefined);
    if (!current) return Promise.resolve(null);
    const next = { ...current, ...patch };
    this.db.prepare('UPDATE users SET display_name=?,status=?,role=? WHERE id=?').run(next.displayName, next.status, next.role, id);
    return Promise.resolve({ ...next, role: normalizeAccountRole(next.role) });
  }
  setTotp(id: string, secret: string | null, enabled: boolean): Promise<UserRecord | null> { this.db.prepare('UPDATE users SET totp_secret=?,totp_enabled=? WHERE id=?').run(secret, enabled ? 1 : 0, id); return this.findUserById(id); }
  close(): void { this.db.close(); }
}
