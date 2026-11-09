import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['e2e/**/*.spec.ts', 'tests/ui/**/*.spec.mjs'],
  fullyParallel: false,
  timeout: 30_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000', trace: 'on-first-retry' },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : { command: 'npm run build:frontend && npm --workspace frontend run start', url: 'http://localhost:3000', reuseExistingServer: false, timeout: 180_000 },
});
