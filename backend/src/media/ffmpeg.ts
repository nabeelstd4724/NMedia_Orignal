import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
export interface FfmpegJob { input: string; output: string; args?: string[]; }
export interface JobResult { code: number; stderr: string; }
const require = createRequire(import.meta.url);
const bundledFfmpeg = (() => { try { return (require('@ffmpeg-installer/ffmpeg') as { path?: string }).path ?? null; } catch { return null; } })();
export class FfmpegRunner {
  constructor(private readonly binary = bundledFfmpeg ?? 'ffmpeg') {}
  run(job: FfmpegJob): Promise<JobResult> { return new Promise((resolve, reject) => { const child = spawn(this.binary, ['-y', '-i', job.input, ...(job.args ?? []), job.output], { stdio: ['ignore', 'ignore', 'pipe'] }); let stderr = ''; child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); }); child.once('error', reject); child.once('close', (code) => resolve({ code: code ?? 1, stderr })); }); }
  probe(input: string): Promise<JobResult> { return new Promise((resolve, reject) => { const child = spawn(this.binary, ['-hide_banner', '-i', input, '-f', 'null', process.platform === 'win32' ? 'NUL' : '/dev/null'], { stdio: ['ignore', 'ignore', 'pipe'] }); let stderr = ''; child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); }); child.once('error', reject); child.once('close', (code) => resolve({ code: code ?? 1, stderr })); }); }
}
