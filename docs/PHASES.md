# NMedia delivery plan

## Sprint 1 — frontend Phase 0/1 (current)

- Next.js App Router + strict TypeScript shell
- Shared contract package with catalog/home envelopes
- Layered API client, catalog hook, domain fixture
- Cinematic public layout: header, hero, responsive movie rows, loading/error/empty states
- Accessible labels, keyboard-friendly links/buttons, responsive breakpoints from mobile to desktop

## Sprint 2 — backend Phase 0/1

- Fastify strict TypeScript app with `/health`, `/ready`, and `/api/v1/home`
- SQLite connection/migration runner isolated under `database/`
- Zod edge validation and standard response envelope
- Structured request logging and environment validation

## Follow-on milestones

1. Auth and session rotation
2. Catalog/search and movie detail
3. Playback entitlement and ad state machine
4. Billing interfaces and manual grants
5. Admin shell and resource management
6. Hardening: tests, OpenAPI generation, accessibility, performance, deployment docs

## Current completion boundary

The local prototype now covers the viewer loop end to end: catalog discovery,
cookie authentication, entitlement-aware playback, free-tier ad selection and
beacons, progress, watchlist, plans, manual subscriptions, and an admin catalog
workspace. Production completion still requires durable SQLite repositories,
real media storage/encoding, a payment provider and webhook reconciliation,
third-party ad delivery, security middleware, and deployment observability.
