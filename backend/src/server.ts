import { buildApp } from './app.js';
import { loadConfig } from './config/env.js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadLocalEnv(): void {
  const candidates = [resolve(process.cwd(), 'backend/.env'), resolve(process.cwd(), '.env')];
  const file = candidates.find((path) => existsSync(path));
  if (!file) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/gu, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadLocalEnv();
const config = loadConfig();
const app = buildApp(config);

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
