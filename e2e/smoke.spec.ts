import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page loads and has no critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/NMedia/i);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === 'critical')).toEqual([]);
});
