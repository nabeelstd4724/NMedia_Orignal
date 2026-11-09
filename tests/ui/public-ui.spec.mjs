import { test, expect } from '@playwright/test';

const api = '**/api/v1';

test('login submits valid credentials and reaches the account flow', async ({ page }) => {
  await page.route(`${api}/auth/login`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { user: { id: 'user-1', email: 'viewer@example.com', displayName: 'Viewer', role: 'user' } } }) }));
  await page.goto('/login');
  await page.waitForTimeout(250);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.getByLabel('Email address').fill('viewer@example.com');
  await page.locator('.password-field input').fill('StrongPass1!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account$/);
});

test('signup validates password strength and terms before submitting', async ({ page }) => {
  await page.route(`${api}/auth/register`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { user: { id: 'user-2', email: 'new@example.com', displayName: 'New viewer', role: 'user' } } }) }));
  await page.goto('/register');
  await page.waitForTimeout(250);
  const password = page.locator('.password-field input');
  await password.fill('StrongPass1!');
  await expect(page.locator('.password-meter p')).toContainText('Strong password.');
  await page.getByLabel('Display name').fill('New viewer');
  await page.getByLabel('Email address').fill('new@example.com');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.locator('.form-error[role="alert"]')).toContainText('accept the terms');
  await page.getByLabel(/I agree to the terms/).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/account$/);
});

test('browse filters synchronize to URL and expose active chips and clear all', async ({ page }) => {
  await page.goto('/browse');
  await page.getByLabel('Search the library').fill('signal');
  await expect(page).toHaveURL(/q=signal/);
  const genre = page.getByRole('button', { name: /Genre All genres/ });
  await genre.focus();
  await genre.press('ArrowDown');
  await page.getByRole('option', { name: 'Mystery' }).click();
  await expect(page).toHaveURL(/q=signal.*genre=Mystery|genre=Mystery.*q=signal/);
  await expect(page.getByRole('button', { name: /Search: signal/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear all' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page).toHaveURL(/\/browse$/);
});

test('public pages do not introduce horizontal overflow at supported widths', async ({ page }) => {
  for (const width of [360, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/browse');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, `horizontal overflow at ${width}px`).toBe(false);
  }
});

test('hero carousel autoplays, pauses on hover, supports controls and swipe', async ({ page }) => {
  const hero = (id, title) => ({ id, slug: id, title, synopsis: `${title} synopsis`, year: 2026, runtimeMin: 100, ageRating: '13+', accessLevel: 'free_with_ads', posterUrl: '', backdropUrl: '', rating: 8, genres: ['Drama'], eyebrow: 'NMEDIA', accent: 'A story worth staying up for.', ctaLabel: 'Explore film' });
  await page.route(`${api}/home`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { hero: hero('hero-a', 'First Signal'), heroes: [hero('hero-a', 'First Signal'), hero('hero-b', 'Second Signal'), hero('hero-c', 'Third Signal')], rows: [] } }) }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'First Signal' })).toBeVisible();
  await page.getByRole('button', { name: 'Next featured story' }).click();
  await expect(page.getByRole('heading', { name: 'Second Signal' })).toBeVisible();
  const carousel = page.getByTestId('hero-carousel');
  await carousel.hover();
  await page.waitForTimeout(7_200);
  await expect(page.getByRole('heading', { name: 'Second Signal' })).toBeVisible();
  await page.evaluate(() => {
    const element = document.querySelector('[data-testid="hero-carousel"]');
    if (!element) throw new Error('Carousel not found');
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 260, pointerType: 'touch' }));
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 80, pointerType: 'touch' }));
  });
  await expect(page.getByRole('heading', { name: 'Third Signal' })).toBeVisible();
  await page.getByRole('button', { name: 'Previous featured story' }).click();
  await expect(page.getByRole('heading', { name: 'Second Signal' })).toBeVisible();
});

test('watch player exposes audio language and subtitle controls', async ({ page }) => {
  const movie = { id: 'movie-one-piece', slug: 'one-piece', title: 'One Piece', synopsis: 'A voyage.', year: 2026, runtimeMin: 24, ageRating: 'NR', accessLevel: 'free_with_ads', posterUrl: '', backdropUrl: '', rating: 7, genres: ['Adventure'] };
  await page.route('**/api/v1/movies/one-piece', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: movie }) }));
  await page.route('**/api/v1/movies/movie-one-piece/playback', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { movieId: movie.id, entitlement: 'allowed', sourceUrl: '/api/v1/media/videos/movie-one-piece/video.mp4?expires=9999999999&sig=test', resumeSeconds: 0, audioTracks: [{ language: 'eng', label: 'English', url: '/api/v1/media/videos/movie-one-piece/audio-eng.m4a?expires=9999999999&sig=test' }, { language: 'jpn', label: 'Japanese', url: '/api/v1/media/videos/movie-one-piece/audio-jpn.m4a?expires=9999999999&sig=test' }], subtitles: [{ language: 'eng', label: 'English', url: '/api/v1/media/videos/movie-one-piece/subtitles-eng.vtt?expires=9999999999&sig=test' }], ads: { enabled: false, preroll: [], midroll: [], skipAfterSec: 0 } } }) }));
  await page.goto('/watch/one-piece');
  await expect(page.getByLabel('Audio language')).toBeVisible();
  await expect(page.getByLabel('Subtitles')).toBeVisible();
  await expect(page.getByLabel('Audio language').locator('option')).toHaveCount(3);
  await page.getByLabel('Audio language').selectOption('jpn');
  await page.getByLabel('Subtitles').selectOption('eng');
  await expect(page.getByLabel('Audio language')).toHaveValue('jpn');
  await expect(page.getByLabel('Subtitles')).toHaveValue('eng');
  await expect(page.locator('video')).toHaveAttribute('src', /\/api\/v1\/media\/videos\/movie-one-piece\/video\.mp4/);
});
