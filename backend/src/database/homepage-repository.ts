import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { HomeResponse } from '../../../contracts/src/index.js';
import { homeFixture } from '../fixtures/home.js';
import type { HomepageRepository, HomepageVersion } from '../homepage/repository.js';

export class SQLiteHomepageRepository implements HomepageRepository {
  private readonly db: Database.Database;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true }); this.db = new Database(path); this.db.pragma('journal_mode = WAL');
    this.db.exec(`CREATE TABLE IF NOT EXISTS homepage_state (id TEXT PRIMARY KEY, draft_json TEXT NOT NULL, published_json TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS homepage_versions (version INTEGER PRIMARY KEY, payload_json TEXT NOT NULL, created_at TEXT NOT NULL);`);
    if (!this.db.prepare('SELECT 1 FROM homepage_state WHERE id=?').get('global')) { const json = JSON.stringify(homeFixture); this.db.prepare('INSERT INTO homepage_state(id,draft_json,published_json,updated_at) VALUES (?,?,?,?)').run('global', json, json, new Date().toISOString()); }
  }
  private normalize(value: HomeResponse): HomeResponse { return { ...value, heroes: value.heroes?.length ? value.heroes : [value.hero] }; }
  private state(): { draft: HomeResponse; published: HomeResponse } { const row = this.db.prepare('SELECT draft_json draft,published_json published FROM homepage_state WHERE id=?').get('global') as { draft: string; published: string }; return { draft: this.normalize(JSON.parse(row.draft) as HomeResponse), published: this.normalize(JSON.parse(row.published) as HomeResponse) }; }
  async getPublished(): Promise<HomeResponse> { return this.state().published; }
  async getDraft(): Promise<HomeResponse> { return this.state().draft; }
  async saveDraft(payload: HomeResponse): Promise<HomeResponse> { const normalized = this.normalize(payload); this.db.prepare('UPDATE homepage_state SET draft_json=?,updated_at=? WHERE id=?').run(JSON.stringify(normalized), new Date().toISOString(), 'global'); return this.getDraft(); }
  async publish(): Promise<HomepageVersion> { const payload = this.state().draft; const next = ((this.db.prepare('SELECT COALESCE(MAX(version),0) version FROM homepage_versions').get() as { version: number }).version) + 1; const createdAt = new Date().toISOString(); const tx = this.db.transaction(() => { this.db.prepare('INSERT INTO homepage_versions(version,payload_json,created_at) VALUES (?,?,?)').run(next, JSON.stringify(payload), createdAt); this.db.prepare('UPDATE homepage_state SET published_json=?,updated_at=? WHERE id=?').run(JSON.stringify(payload), createdAt, 'global'); }); tx(); return { version: next, createdAt, payload }; }
  async listVersions(): Promise<HomepageVersion[]> { return (this.db.prepare('SELECT version,payload_json payload,created_at createdAt FROM homepage_versions ORDER BY version DESC LIMIT 10').all() as Array<{ version: number; payload: string; createdAt: string }>).map((row) => ({ version: row.version, createdAt: row.createdAt, payload: JSON.parse(row.payload) as HomeResponse })); }
  async restore(version: number): Promise<HomeResponse | null> { const row = this.db.prepare('SELECT payload_json payload FROM homepage_versions WHERE version=?').get(version) as { payload: string } | undefined; if (!row) return null; await this.saveDraft(JSON.parse(row.payload) as HomeResponse); return this.getDraft(); }
  close(): void { this.db.close(); }
}
