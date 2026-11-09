import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, renameSync, rmSync, openSync, readSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES, UPLOAD_CHUNK_BYTES, type MediaUploadReceipt, type StartMediaUpload } from '../../../contracts/src/index.js';

export class UploadError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) { super(message); }
}
interface StoredUpload extends MediaUploadReceipt { ownerId: string; }
interface PendingUpload extends StoredUpload { offset: number; expiresAt: number; }
const idPattern = /^[a-f0-9-]{36}$/;

/** Bounded chunks go to disk, never a whole movie in RAM. Finished metadata survives restart. */
export class LocalUploadStore {
  private readonly pending = new Map<string, PendingUpload>();
  private readonly root: string;
  constructor(mediaRoot: string) { this.root = join(mediaRoot, 'uploads'); }
  path(id: string, suffix = 'bin'): string {
    if (!idPattern.test(id)) throw new UploadError(404, 'UPLOAD_NOT_FOUND', 'Upload was not found.');
    return join(this.root, `${id}.${suffix}`);
  }
  start(input: StartMediaUpload, ownerId: string): { id: string; chunkSize: number } {
    for (const upload of this.pending.values()) if (upload.expiresAt < Date.now()) this.cancel(upload.id, upload.ownerId);
    if ([...this.pending.values()].filter((upload) => upload.ownerId === ownerId).length >= 6) {
      throw new UploadError(429, 'UPLOAD_LIMIT', 'Finish or cancel an existing upload first.');
    }
    const max = input.kind === 'image' ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
    if (!Number.isSafeInteger(input.size) || input.size < 1 || input.size > max) throw new UploadError(413, 'FILE_TOO_LARGE', 'Image limit: 10 MB. Movie limit: 2 GB. Empty files are not allowed.');
    if (!input.contentType.startsWith(`${input.kind}/`)) throw new UploadError(400, 'FILE_TYPE', 'File type does not match this field.');
    const id = randomUUID();
    mkdirSync(this.root, { recursive: true });
    writeFileSync(this.path(id, 'part'), Buffer.alloc(0), { flag: 'wx' });
    this.pending.set(id, { ...input, filename: input.filename.replace(/^.*[\\/]/, ''), id, ownerId, offset: 0, expiresAt: Date.now() + 86400000 });
    return { id, chunkSize: UPLOAD_CHUNK_BYTES };
  }
  private owned(id: string, ownerId: string): PendingUpload {
    const upload = this.pending.get(id);
    if (!upload || upload.ownerId !== ownerId) throw new UploadError(404, 'UPLOAD_NOT_FOUND', 'Upload was not found.');
    if (upload.expiresAt < Date.now()) { this.cancel(id, ownerId); throw new UploadError(410, 'UPLOAD_EXPIRED', 'Choose the file again to restart the upload.'); }
    return upload;
  }
  append(id: string, ownerId: string, offset: number, bytes: Buffer): number {
    const upload = this.owned(id, ownerId);
    if (offset !== upload.offset) throw new UploadError(409, 'UPLOAD_OFFSET', 'Upload position changed. Choose the file again.');
    if (!bytes.length || bytes.length > UPLOAD_CHUNK_BYTES || upload.offset + bytes.length > upload.size) throw new UploadError(413, 'UPLOAD_SIZE', 'Chunk exceeds the declared upload size.');
    appendFileSync(this.path(id, 'part'), bytes);
    upload.offset += bytes.length;
    return upload.offset;
  }
  finish(id: string, ownerId: string): MediaUploadReceipt {
    const upload = this.owned(id, ownerId);
    if (upload.offset !== upload.size) throw new UploadError(409, 'UPLOAD_INCOMPLETE', 'The file has not finished uploading.');
    const head = Buffer.alloc(64);
    const fd = openSync(this.path(id, 'part'), 'r');
    try { readSync(fd, head, 0, head.length, 0); } finally { closeSync(fd); }
    if (!matchesSignature(head, upload.contentType)) {
      this.cancel(id, ownerId);
       throw new UploadError(415, 'FILE_TYPE', 'File contents do not match the selected format. Use JPEG, PNG, WebP, MP4, WebM or MKV.');
    }
    const { offset: _offset, expiresAt: _expires, ...stored } = upload;
    if (stored.kind === 'image') stored.url = `/api/v1/media/images/${id}`;
    renameSync(this.path(id, 'part'), this.path(id));
    writeFileSync(this.path(id, 'json'), JSON.stringify(stored), { flag: 'wx' });
    this.pending.delete(id);
    return this.receipt(stored);
  }
  get(id: string): StoredUpload | null {
    try { return JSON.parse(readFileSync(this.path(id, 'json'), 'utf8')) as StoredUpload; }
    catch (error) { if (error instanceof UploadError || (error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  }
  requireVideo(id: string, ownerId: string): void {
    const upload = this.get(id);
    if (!upload || upload.kind !== 'video' || upload.ownerId !== ownerId) throw new UploadError(400, 'INVALID_VIDEO_UPLOAD', 'Upload a movie file using this account before attaching it.');
  }
  cancel(id: string, ownerId: string): void {
    const upload = this.pending.get(id);
    if (!upload || upload.ownerId !== ownerId) return;
    rmSync(this.path(id, 'part'), { force: true });
    this.pending.delete(id);
  }
  private receipt({ ownerId: _owner, ...receipt }: StoredUpload): MediaUploadReceipt { return receipt; }
}

function matchesSignature(bytes: Buffer, type: string): boolean {
  switch (type) {
    case 'image/jpeg': return bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    case 'image/png': return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case 'image/webp': return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    case 'video/mp4': return bytes.toString('ascii', 4, 8) === 'ftyp';
    case 'video/webm': return bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
    case 'video/x-matroska':
    case 'video/matroska': return bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
    default: return false;
  }
}
