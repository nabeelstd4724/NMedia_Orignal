import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.UI_REVIEW_BASE_URL ?? 'http://localhost:3000';
const outputRoot = process.env.UI_REVIEW_OUTPUT ?? 'docs/ui-review/before';
const widths = [360, 768, 1280, 1920];
const pages = [
  ['home', '/'],
  ['login', '/login'],
  ['register', '/register'],
  ['browse', '/browse'],
  ['pricing', '/pricing'],
  ['account', '/account'],
  ['movie-detail', '/movie/afterglow-city'],
  ['watch', '/watch/afterglow-city'],
  ['not-found', '/this-page-does-not-exist'],
];

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, path] of pages) {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => undefined);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${outputRoot}/${name}-${width}.png`, fullPage: true, timeout: 8000 }).catch(async (error) => {
        console.warn(`Full-page screenshot skipped for ${name}-${width}: ${error.message}`);
        await page.screenshot({ path: `${outputRoot}/${name}-${width}.png`, fullPage: false, timeout: 8000 }).catch((fallbackError) => console.warn(`Viewport screenshot skipped for ${name}-${width}: ${fallbackError.message}`));
      });
      await page.close();
    }
  }
} finally {
  await browser.close();
}
