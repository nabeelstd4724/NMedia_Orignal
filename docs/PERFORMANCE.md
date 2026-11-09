# Performance budgets and load testing

The default API budgets are p95 response time under **500 ms**, error rate under
**1%**, and frontend initial load under **3 s** on the CI smoke profile. These
are guardrails, not a substitute for production capacity planning.

Run the credential-free API load test with [k6](https://k6.io/):

```bash
k6 run loadtest/k6-smoke.js
# k6 run -e BASE_URL=http://host:4000 -e VUS=20 -e DURATION=2m loadtest/k6-smoke.js
```

Playwright accessibility smoke (requires browsers): `npm run test:e2e`.
Record results and environment with each baseline; do not point this test at a
production system without an approved test window.

## Test tooling setup

The repository keeps browser/unit tooling as optional development tooling so
the credential-free backend check remains installable in minimal environments:

```bash
npm install --save-dev vitest supertest @playwright/test @axe-core/playwright
npx playwright install --with-deps chromium
npx vitest run
npx playwright test
```

`backend/tests/app.test.ts` uses Fastify injection and can be migrated to
Supertest when an HTTP listener test is needed; it does not contact external
providers.
