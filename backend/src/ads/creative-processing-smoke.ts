import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { InMemoryAdRepository } from './repository.js';
import { AdCreativeProcessor } from './creative-processor.js';
import { LocalUploadStore } from '../media/uploads.js';
import { FfmpegRunner } from '../media/ffmpeg.js';

const require = createRequire(import.meta.url);
const ffmpegPath = (require('@ffmpeg-installer/ffmpeg') as { path: string }).path;
function generateVideo(output: string): Promise<void> { return new Promise((resolve, reject) => { const child = spawn(ffmpegPath, ['-y', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:d=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', output], { stdio: 'ignore' }); child.once('error', reject); child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))); }); }

const root = mkdtempSync(join(process.cwd(), '.creative-test-'));
try {
  const uploads = new LocalUploadStore(join(root, 'media'));
  const input = Buffer.concat([Buffer.from('0000ftyp'), Buffer.alloc(64)]);
  const started = uploads.start({ filename: 'ad.mkv', kind: 'video', contentType: 'video/mp4', size: input.length }, 'admin-1');
  uploads.append(started.id, 'admin-1', 0, input);
  uploads.finish(started.id, 'admin-1');
  const ads = new InMemoryAdRepository();
  const campaign = await ads.createCampaign({ name: 'Creative Smoke', active: true, startsAt: '2020-01-01T00:00:00.000Z', endsAt: '2099-01-01T00:00:00.000Z', placements: ['preroll'], priority: 10, weight: 100, kind: 'hosted', creativeUploadId: started.id });
  let failNext = true;
  const encoder = {
    async probe() { return { code: 0, stderr: 'Duration: 00:00:15.250' }; },
    async run(job: { output: string }) { if (failNext) { failNext = false; return { code: 1, stderr: 'encoder failed' }; } writeFileSync(job.output, Buffer.from('processed')); return { code: 0, stderr: '' }; },
  };
  const processor = new AdCreativeProcessor(join(root, 'media'), uploads, ads, encoder);
  const failed = await processor.process(campaign.id, 'admin-1');
  assert.equal(failed.status, 'failed');
  assert.equal(failed.attempt, 1);
  assert.equal(failed.error, 'CREATIVE_ENCODE_FAILED');
  const ready = await processor.process(campaign.id, 'admin-1');
  assert.equal(ready.status, 'ready');
  assert.equal(ready.attempt, 2);
  assert.equal(ready.durationSec, 15.25);
  assert.equal((await ads.listCampaigns()).find((item) => item.id === campaign.id)?.mediaUrl, `/api/v1/media/ads/campaigns/${campaign.id}/creative`);
  const realSource = join(root, 'real-source.mp4');
  await generateVideo(realSource);
  const realBytes = (await import('node:fs')).readFileSync(realSource);
  const realUpload = uploads.start({ filename: 'real-ad.mp4', kind: 'video', contentType: 'video/mp4', size: realBytes.length }, 'admin-1');
  uploads.append(realUpload.id, 'admin-1', 0, realBytes);
  uploads.finish(realUpload.id, 'admin-1');
  const realCampaign = await ads.createCampaign({ name: 'Real Creative Smoke', active: true, startsAt: '2020-01-01T00:00:00.000Z', endsAt: '2099-01-01T00:00:00.000Z', placements: ['preroll'], priority: 10, weight: 100, kind: 'hosted', creativeUploadId: realUpload.id });
  const realProcessor = new AdCreativeProcessor(join(root, 'real-media'), uploads, ads, new FfmpegRunner());
  const realReady = await realProcessor.process(realCampaign.id, 'admin-1');
  assert.equal(realReady.status, 'ready', realReady.error);
  assert.equal(realReady.durationSec !== undefined && realReady.durationSec <= 2, true);
  console.info('Real FFmpeg creative smoke test passed: probe, MP4 normalization and thumbnail generation.');
  console.info('Creative processing smoke test passed: encode failure, retry, duration and artifact URLs.');
} finally { rmSync(root, { recursive: true, force: true }); }
