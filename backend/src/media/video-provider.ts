export interface VideoAsset { id: string; sourceKey: string; hlsManifestKey: string; status: 'pending' | 'ready' | 'failed'; }
export interface VideoProvider { ingest(sourceKey: string): Promise<VideoAsset>; getAsset(id: string): Promise<VideoAsset | null>; }
export class LocalVideoProvider implements VideoProvider {
  private readonly assets = new Map<string, VideoAsset>();
  async ingest(sourceKey: string): Promise<VideoAsset> { const asset = { id: randomUUID(), sourceKey, hlsManifestKey: `${sourceKey.replace(/\.[^.]+$/, '')}/master.m3u8`, status: 'pending' as const }; this.assets.set(asset.id, asset); return asset; }
  async getAsset(id: string): Promise<VideoAsset | null> { return this.assets.get(id) ?? null; }
}
import { randomUUID } from 'node:crypto';
