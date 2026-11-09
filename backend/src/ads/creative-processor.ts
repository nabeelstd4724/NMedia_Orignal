import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { AdCreativeStatus, AdRepository } from './repository.js';
import type { LocalUploadStore } from '../media/uploads.js';
import { FfmpegRunner, type JobResult } from '../media/ffmpeg.js';

export const AD_CREATIVE_MAX_BYTES = 512 * 1024 * 1024;
export const AD_CREATIVE_MAX_DURATION_SEC = 120;

export interface AdCreativeEncoder {
  probe(input: string): Promise<JobResult>;
  run(job: { input: string; output: string; args?: string[] }): Promise<JobResult>;
}

function durationFromStderr(stderr: string): number | undefined {
  const match = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/i);
  if (!match) return undefined;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(`0.${match[4] ?? '0'}`);
}

export class AdCreativeProcessor {
  private readonly root: string;
  constructor(mediaRoot: string, private readonly uploads: LocalUploadStore, private readonly ads: AdRepository, private readonly encoder: AdCreativeEncoder = new FfmpegRunner()) { this.root = join(mediaRoot, 'ads'); }

  outputPath(campaignId: string, kind: 'creative' | 'thumbnail'): string { return join(this.root, campaignId, kind === 'creative' ? 'creative.mp4' : 'thumbnail.jpg'); }
  async status(campaignId: string): Promise<AdCreativeStatus | null> { return this.ads.getCreativeStatus(campaignId); }

  async process(campaignId: string, ownerId: string): Promise<AdCreativeStatus> {
    const campaign = (await this.ads.listCampaigns()).find((item) => item.id === campaignId);
    if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
    if (campaign.kind !== 'hosted' || !campaign.creativeUploadId) throw new Error('HOSTED_CREATIVE_REQUIRED');
    const previous = await this.ads.getCreativeStatus(campaignId);
    const attempt = (previous?.attempt ?? 0) + 1;
    const now = () => new Date().toISOString();
    const save = (status: AdCreativeStatus) => this.ads.saveCreativeStatus(status);
    await save({ campaignId, status: 'processing', progress: 5, attempt, updatedAt: now() });
    try {
      this.uploads.requireVideo(campaign.creativeUploadId, ownerId);
      const input = this.uploads.path(campaign.creativeUploadId);
      if (!existsSync(input)) throw new Error('CREATIVE_FILE_NOT_FOUND');
      if (statSync(input).size > AD_CREATIVE_MAX_BYTES) throw new Error('CREATIVE_TOO_LARGE');
      const probe = await this.encoder.probe(input);
      const durationSec = durationFromStderr(probe.stderr);
      if (probe.code !== 0 || durationSec === undefined) throw new Error('CREATIVE_PROBE_FAILED');
      if (durationSec > AD_CREATIVE_MAX_DURATION_SEC) throw new Error('CREATIVE_DURATION_LIMIT');
      await save({ campaignId, status: 'processing', progress: 25, attempt, durationSec, updatedAt: now() });
      const outputDir = join(this.root, campaignId);
      mkdirSync(outputDir, { recursive: true });
      const output = this.outputPath(campaignId, 'creative');
      const thumbnail = this.outputPath(campaignId, 'thumbnail');
      const normalized = await this.encoder.run({ input, output, args: ['-y', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-f', 'mp4'] });
      if (normalized.code !== 0) throw new Error('CREATIVE_ENCODE_FAILED');
      await save({ campaignId, status: 'processing', progress: 80, attempt, durationSec, updatedAt: now() });
      const thumbnailJob = await this.encoder.run({ input: output, output: thumbnail, args: ['-y', '-ss', '00:00:01', '-frames:v', '1', '-vf', 'scale=640:-2', '-f', 'image2'] });
      if (thumbnailJob.code !== 0) throw new Error('CREATIVE_THUMBNAIL_FAILED');
      const mediaUrl = `/api/v1/media/ads/campaigns/${campaignId}/creative`;
      const thumbnailUrl = `/api/v1/media/ads/campaigns/${campaignId}/thumbnail`;
      await this.ads.updateCampaign(campaignId, { mediaUrl, durationSec });
      return save({ campaignId, status: 'ready', progress: 100, attempt, durationSec, mediaUrl, thumbnailUrl, updatedAt: now() });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'CREATIVE_PROCESSING_FAILED';
      return save({ campaignId, status: 'failed', progress: 0, attempt, error: message, updatedAt: now() });
    }
  }

}
