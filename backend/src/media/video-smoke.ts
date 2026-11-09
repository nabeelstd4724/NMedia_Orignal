import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LocalUploadStore } from './uploads.js';
import { VideoProcessor, type VideoEncoder } from './video-processor.js';

const root = mkdtempSync(join(process.cwd(), '.video-test-'));
try {
  const uploads = new LocalUploadStore(root);
  const input = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(16)]);
  const id = uploads.start({ filename: 'multi-track.mkv', kind: 'video', contentType: 'video/x-matroska', size: input.length }, 'owner');
  uploads.append(id.id, 'owner', 0, input);
  uploads.finish(id.id, 'owner');
  const encoder: VideoEncoder = {
    async probe() { return { code: 0, stderr: 'Stream #0:0: Video: h264\nStream #0:1(eng): Audio: aac\nStream #0:2(jpn): Audio: aac\nStream #0:3(eng): Subtitle: subrip' }; },
    async run(job) { writeFileSync(job.output, Buffer.from('encoded')); return { code: 0, stderr: '' }; },
  };
  const processor = new VideoProcessor(root, uploads, encoder);
  const media = await processor.ensure({ id: 'movie_video_smoke', slug: 'video-smoke', title: 'Video smoke', synopsis: '', year: 2026, runtimeMin: 1, ageRating: 'PG', accessLevel: 'free_with_ads', posterUrl: '', backdropUrl: '', rating: 1, genres: ['Drama'], status: 'published', videoUploadId: id.id });
  assert.ok(media);
  assert.deepEqual(media.audioTracks.map((track) => track.language), ['eng', 'jpn']);
  assert.deepEqual(media.subtitles.map((track) => track.language), ['eng']);
  assert.equal(processor.read('movie_video_smoke')?.source, 'video.mp4');
  console.info('Video processing smoke test passed: browser MP4, multiple audio tracks and WebVTT subtitles.');
} finally { rmSync(root, { recursive: true, force: true }); }
