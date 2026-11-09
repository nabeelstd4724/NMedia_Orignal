import { createHmac, timingSafeEqual } from 'node:crypto';
export class HlsUrlSigner {
  constructor(private readonly secret: string, private readonly ttlSeconds = 300) {}
  sign(path: string, now = Math.floor(Date.now() / 1000)): string { const expires = now + this.ttlSeconds; const signature = createHmac('sha256', this.secret).update(`${path}:${expires}`).digest('base64url'); return `${path}?expires=${expires}&sig=${signature}`; }
  verify(url: string, now = Math.floor(Date.now() / 1000)): boolean { const parsed = new URL(url, 'http://nmedia.local'); const expires = Number(parsed.searchParams.get('expires')); const sig = parsed.searchParams.get('sig') ?? ''; if (!Number.isSafeInteger(expires) || expires < now || !sig) return false; const expected = createHmac('sha256', this.secret).update(`${parsed.pathname}:${expires}`).digest('base64url'); return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); }
}
