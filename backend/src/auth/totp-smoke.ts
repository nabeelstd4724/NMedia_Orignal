import assert from 'node:assert/strict';
import { createTotpSecret, otpauthUrl, totpCode, verifyTotp } from './totp.js';

const secret = createTotpSecret();
const timestamp = 1_700_000_000_000;
const code = totpCode(secret, timestamp);
assert.match(secret, /^[A-Z2-7]{32}$/u);
assert.match(otpauthUrl(secret, 'admin@example.test'), /^otpauth:\/\/totp\//u);
assert.equal(verifyTotp(secret, code, timestamp), true);
assert.equal(verifyTotp(secret, '000000', timestamp), false);
console.info('TOTP tests passed: secret generation, otpauth URI and time-window verification.');
