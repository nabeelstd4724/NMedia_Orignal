import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { PlatformSettings, SettingsRepository } from '../settings/repository.js';

export class SQLiteSettingsRepository implements SettingsRepository {
  private readonly db: Database.Database;
  constructor(path: string, defaults: PlatformSettings) {
    mkdirSync(dirname(path), { recursive: true }); this.db = new Database(path); this.db.pragma('journal_mode = WAL');
    this.db.exec('CREATE TABLE IF NOT EXISTS platform_settings (id TEXT PRIMARY KEY, payload_json TEXT NOT NULL, updated_at TEXT NOT NULL);');
    if (!this.db.prepare('SELECT 1 FROM platform_settings WHERE id=?').get('global')) this.db.prepare('INSERT INTO platform_settings(id,payload_json,updated_at) VALUES (?,?,?)').run('global', JSON.stringify(defaults), new Date().toISOString());
  }
  async get(): Promise<PlatformSettings> { const row = this.db.prepare('SELECT payload_json payload FROM platform_settings WHERE id=?').get('global') as { payload: string }; return JSON.parse(row.payload) as PlatformSettings; }
  async save(settings: PlatformSettings): Promise<PlatformSettings> { this.db.prepare('UPDATE platform_settings SET payload_json=?,updated_at=? WHERE id=?').run(JSON.stringify(settings), new Date().toISOString(), 'global'); return this.get(); }
  close(): void { this.db.close(); }
}
