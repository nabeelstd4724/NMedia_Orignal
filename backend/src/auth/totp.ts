import { createHmac, randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function createTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = 0; let value = 0; let output = '';
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { output += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(value: string): Buffer {
  let bits = 0; let buffer = 0; const bytes: number[] = [];
  for (const character of value.replace(/=+$/u, '').toUpperCase()) { const index = ALPHABET.indexOf(character); if (index < 0) throw new Error('Invalid TOTP secret'); buffer = (buffer << 5) | index; bits += 5; if (bits >= 8) { bytes.push((buffer >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(bytes);
}

export function totpCode(secret: string, timestamp = Date.now()): string {
  const counter = Math.floor(timestamp / 30_000); const data = Buffer.alloc(8); data.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', decodeBase32(secret)).update(data).digest(); const offset = digest[digest.length - 1] & 15;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, '0');
}

export function verifyTotp(secret: string, code: string, timestamp = Date.now()): boolean {
  if (!/^\d{6}$/u.test(code)) return false;
  return [-1, 0, 1].some((step) => totpCode(secret, timestamp + step * 30_000) === code);
}

export function otpauthUrl(secret: string, email: string): string {
  return `otpauth://totp/NMedia:${encodeURIComponent(email)}?secret=${secret}&issuer=NMedia&algorithm=SHA1&digits=6&period=30`;
}
