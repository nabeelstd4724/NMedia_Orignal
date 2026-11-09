import { chromium } from '@playwright/test';

const baseURL = process.env.UI_REVIEW_BASE_URL ?? 'http://localhost:3000';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 900 } });

try {
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('link', { name: 'Browse' }).first().click();
  await page.getByLabel('Search the library').fill('signal');
  await page.waitForTimeout(150);
  if (!page.url().includes('q=signal')) throw new Error('Browse query was not written to the URL.');

  await page.goto(`${baseURL}/register`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const password = page.locator('.password-field input');
  await password.fill('StrongPass1!');
  if (!((await page.locator('.password-meter p').textContent()) ?? '').includes('Strong password.')) throw new Error('Registration password meter did not update.');
  await page.getByRole('button', { name: 'Show password' }).click();
  if ((await page.locator('input[type="text"]').first().getAttribute('type')) !== 'text') throw new Error('Password visibility toggle did not update the input.');
  console.log('UI smoke checks passed.');
} finally {
  await browser.close();
}
