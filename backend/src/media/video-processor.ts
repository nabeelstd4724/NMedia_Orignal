import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CatalogMovie } from '../catalog/repository.js';
import type { LocalUploadStore } from './uploads.js';
import { FfmpegRunner, type JobResult } from './ffmpeg.js';

export interface VideoTrack { language: string; label: string; asset: string; }
export interface ProcessedVideo { source: string; audioTracks: VideoTrack[]; subtitles: VideoTrack[]; }
export interface VideoEncoder { probe(input: string): Promise<JobResult>; run(job: { input: string; output: string; args?: string[] }): Promise<JobResult>; }

const languageNames: Record<string, string> = { eng: 'English', en: 'English', jpn: 'Japanese', ja: 'Japanese', kor: 'Korean', ko: 'Korean', spa: 'Spanish', es: 'Spanish', fra: 'French', fre: 'French', fr: 'French', deu: 'German', ger: 'German', de: 'German', hin: 'Hindi', por: 'Portuguese', und: 'Unknown' };

function streamsFromProbe(stderr: string): Array<{ index: number; kind: 'audio' | 'subtitle'; language: string }> {
  const streams: Array<{ index: number; kind: 'audio' | 'subtitle'; language: string }> = [];
  const regex = /^\s*Stream #\d+:(\d+)(?:\(([^)]+)\))?:\s+(Audio|Subtitle):/gimu;
  for (const match of stderr.matchAll(regex)) { const index = Number(match[1]); if (!streams.some((stream) => stream.index === index)) streams.push({ index, language: (match[2] ?? 'und').toLowerCase(), kind: match[3].toLowerCase() === 'audio' ? 'audio' : 'subtitle' }); }
  return streams;
}

export class VideoProcessor {
  private readonly root: string;
  private readonly jobs = new Map<string, Promise<ProcessedVideo | null>>();
  constructor(mediaRoot: string, private readonly uploads: LocalUploadStore, private readonly encoder: VideoEncoder = new FfmpegRunner()) { this.root = join(mediaRoot, 'videos'); }

  private dir(movieId: string): string { return join(this.root, movieId); }
  private metadataPath(movieId: string): string { return join(this.dir(movieId), 'metadata.json'); }
  assetPath(movieId: string, asset: string): string {
    if (!/^[A-Za-z0-9_-]+$/u.test(movieId) || !/^[A-Za-z0-9_.-]+$/u.test(asset)) throw new Error('Invalid media asset');
    return join(this.dir(movieId), asset);
  }
  read(movieId: string): ProcessedVideo | null {
    try { const value = JSON.parse(readFileSync(this.metadataPath(movieId), 'utf8')) as ProcessedVideo; const unique = (tracks: VideoTrack[], key: keyof VideoTrack) => tracks.filter((track, index, all) => all.findIndex((candidate) => candidate[key] === track[key]) === index); return existsSync(this.assetPath(movieId, value.source)) ? { ...value, audioTracks: unique(value.audioTracks, 'asset'), subtitles: unique(value.subtitles, 'language') } : null; } catch { return null; }
  }

  async ensure(movie: CatalogMovie): Promise<ProcessedVideo | null> {
    if (!movie.videoUploadId) return null;
    const existing = this.read(movie.id); if (existing) return existing;
    const running = this.jobs.get(movie.id); if (running) return running;
    const job = this.process(movie).finally(() => this.jobs.delete(movie.id)); this.jobs.set(movie.id, job); return job;
  }

  private async process(movie: CatalogMovie): Promise<ProcessedVideo | null> {
    const upload = this.uploads.get(movie.videoUploadId!); if (!upload || upload.kind !== 'video') return null;
    const input = this.uploads.path(upload.id); if (!existsSync(input)) return null;
    const outputDir = this.dir(movie.id); mkdirSync(outputDir, { recursive: true });
    const probe = await this.encoder.probe(input); if (probe.code !== 0) throw new Error('VIDEO_PROBE_FAILED');
    const streams = streamsFromProbe(probe.stderr);
    const video = await this.encoder.run({ input, output: join(outputDir, 'video.mp4'), args: ['-map', '0:v:0', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', '-f', 'mp4'] });
    if (video.code !== 0) throw new Error('VIDEO_TRANSCODE_FAILED');
    const audioTracks: VideoTrack[] = [];
    for (const stream of streams.filter((item) => item.kind === 'audio')) {
      const asset = `audio-${stream.index}.m4a`;
      const result = await this.encoder.run({ input, output: join(outputDir, asset), args: ['-map', `0:${stream.index}`, '-vn', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-f', 'mp4'] });
      if (result.code === 0) audioTracks.push({ language: stream.language, label: languageNames[stream.language] ?? stream.language.toUpperCase(), asset });
    }
    const subtitles: VideoTrack[] = [];
    const subtitleLanguages = new Set<string>();
    for (const stream of streams.filter((item) => item.kind === 'subtitle')) {
      const asset = `subtitle-${stream.index}.vtt`;
      const result = await this.encoder.run({ input, output: join(outputDir, asset), args: ['-map', `0:${stream.index}`, '-c:s', 'webvtt', '-f', 'webvtt'] });
      if (result.code === 0 && !subtitleLanguages.has(stream.language)) { subtitleLanguages.add(stream.language); subtitles.push({ language: stream.language, label: languageNames[stream.language] ?? stream.language.toUpperCase(), asset }); }
    }
    const processed = { source: 'video.mp4', audioTracks, subtitles };
    writeFileSync(this.metadataPath(movie.id), JSON.stringify(processed));
    return processed;
  }
}
