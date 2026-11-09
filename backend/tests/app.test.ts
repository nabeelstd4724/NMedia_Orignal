import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';

const config = loadConfig({ NODE_ENV: 'test' });

describe('HTTP foundation', () => {
  it('serves health and Prometheus metrics without external services', async () => {
    const app = buildApp(config);
    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    const metrics = await app.inject({ method: 'GET', url: '/metrics' });
    expect(metrics.statusCode).toBe(200);
    expect(metrics.body).toContain('nmedia_http_requests_total 1');
    await app.close();
  });
});
