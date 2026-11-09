import { randomBytes, randomUUID } from 'node:crypto';

export type AccountStatus = 'active' | 'suspended' | 'deleted';
export type AccountRole = 'user' | 'editor' | 'admin' | 'super_admin';

/** Normalize role spellings used by older SQLite databases to the API's canonical roles. */
export function normalizeAccountRole(value: unknown): AccountRole {
  const role = String(value ?? '').trim().toLowerCase().replace(/[-\s]/g, '_');
  if (role === 'superadmin' || role === 'super_admin' || role === 'administrator' || role === 'owner') return 'super_admin';
  if (role === 'admin' || role === 'administrator_staff') return 'admin';
  if (role === 'editor' || role === 'content_editor') return 'editor';
  return 'user';
}

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  status: AccountStatus;
  createdAt: string;
  role: AccountRole;
  totpSecret?: string | null;
  totpEnabled?: boolean;
}

export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: number;
  familyId?: string;
}

/** Storage boundary for auth. Replace this implementation with SQLite without changing routes. */
export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUser(email: string, displayName: string, passwordHash: string, role?: AccountRole): Promise<UserRecord>;
  createSession(userId: string, expiresAt: number): Promise<SessionRecord>;
  findSession(token: string): Promise<SessionRecord | null>;
  deleteSession(token: string): Promise<void>;
  rotateSession?(token: string, expiresAt: number): Promise<SessionRecord | null>;
  countUsers(): Promise<number>;
  listUsers(): Promise<UserRecord[]>;
  updateUser(id: string, patch: Partial<Pick<UserRecord, 'displayName' | 'role' | 'status'>>): Promise<UserRecord | null>;
  setTotp(id: string, secret: string | null, enabled: boolean): Promise<UserRecord | null>;
}

export class InMemoryAuthRepository implements AuthRepository {
  private readonly usersById = new Map<string, UserRecord>();
  private readonly usersByEmail = new Map<string, UserRecord>();
  private readonly sessions = new Map<string, SessionRecord>();

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.usersByEmail.get(email) ?? null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.usersById.get(id) ?? null;
  }

  async createUser(email: string, displayName: string, passwordHash: string, role: AccountRole = 'user'): Promise<UserRecord> {
    const user: UserRecord = { id: randomUUID(), email, displayName, passwordHash, status: 'active', createdAt: new Date().toISOString(), role, totpSecret: null, totpEnabled: false };
    this.usersById.set(user.id, user);
    this.usersByEmail.set(user.email, user);
    return user;
  }

  async createSession(userId: string, expiresAt: number): Promise<SessionRecord> {
    const session = { token: randomBytes(32).toString('base64url'), userId, expiresAt, familyId: randomUUID() };
    this.sessions.set(session.token, session);
    return session;
  }

  async findSession(token: string): Promise<SessionRecord | null> {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }
  async rotateSession(token: string, expiresAt: number): Promise<SessionRecord | null> {
    const current = await this.findSession(token);
    if (!current) return null;
    this.sessions.delete(token);
    return this.createSession(current.userId, expiresAt);
  }

  async countUsers(): Promise<number> { return this.usersById.size; }
  async listUsers(): Promise<UserRecord[]> { return [...this.usersById.values()]; }
  async updateUser(id: string, patch: Partial<Pick<UserRecord, 'displayName' | 'role' | 'status'>>): Promise<UserRecord | null> { const user = this.usersById.get(id); if (!user) return null; Object.assign(user, patch); return user; }
  async setTotp(id: string, secret: string | null, enabled: boolean): Promise<UserRecord | null> { const user = this.usersById.get(id); if (!user) return null; user.totpSecret = secret; user.totpEnabled = enabled; return user; }
}
