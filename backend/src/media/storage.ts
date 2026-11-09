import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

export interface StorageService { put(key: string, data: Uint8Array): Promise<void>; get(key: string): Promise<Buffer>; exists(key: string): Promise<boolean>; url(key: string): string; }
export class LocalStorageService implements StorageService {
  constructor(private readonly root: string) {}
  private path(key: string): string { const target = resolve(this.root, key); if (relative(resolve(this.root), target).startsWith('..')) throw new Error('Invalid storage key'); return target; }
  async put(key: string, data: Uint8Array): Promise<void> { const path = this.path(key); await mkdir(dirname(path), { recursive: true }); await writeFile(path, data); }
  async get(key: string): Promise<Buffer> { return readFile(this.path(key)); }
  async exists(key: string): Promise<boolean> { try { await stat(this.path(key)); return true; } catch { return false; } }
  url(key: string): string { return `/media/${encodeURIComponent(key).replace(/%2F/g, '/')}`; }
}
