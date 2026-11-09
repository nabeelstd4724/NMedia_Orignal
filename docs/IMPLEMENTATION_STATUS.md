# Implementation status

This document maps the original delivery brief in [`PHASES.md`](PHASES.md) to
what is present in the repository. “Implemented” means the local boundary and
checks exist; it does not imply production persistence, provider integration,
or deployment readiness.

| Brief phase | Status | Evidence / boundary |
| --- | --- | --- |
| Sprint 1 — frontend Phase 0/1 | Implemented locally | Next.js App Router, strict TypeScript, shared contracts, API client, fixture fallback, responsive public pages, and loading/error/empty states in `frontend/`. |
| Sprint 2 — backend Phase 0/1: Fastify app and health/home routes | Implemented locally | `backend/src/app.ts` registers Fastify, `/health`, `/ready`, and `/api/v1/home`; `backend/src/smoke.ts` exercises the HTTP boundary. |
| Sprint 2 — SQLite connection and migration runner | Partial | `better-sqlite3` is used for durable auth users/sessions in `backend/src/database/auth-repository.ts`; catalog, viewer, ads, plans, subscriptions, and audit repositories remain in-memory. `database/` still needs a full migrator and all-domain schema. |
| Sprint 2 — edge validation and response envelopes | Implemented locally | Fastify JSON schemas validate route inputs and the app error handler emits `VALIDATION_ERROR` plus standard `data`/`error` envelopes. |
| Sprint 2 — structured request logging and environment validation | Partially implemented | Fastify logging and typed environment parsing exist in `backend/src/config/env.ts`. There is no production log sink, secret manager, or readiness dependency check. |
| Follow-on 1: auth and session rotation | Implemented locally / partial production | Register/login/logout/me/refresh, scrypt password hashing, durable SQLite users/sessions, hashed tokens, family rotation and reuse detection exist. Multi-instance session storage and account recovery remain. |
| Follow-on 2: catalog/search and movie detail | Implemented locally | Published catalog, filters, pagination, genres, and slug detail routes use seeded in-memory records. Durable catalog/admin management is deferred. |
| Follow-on 3: playback entitlement and ad state machine | Partial production foundation | Playback entitlement, HLS signing/verification primitives, local storage/FFmpeg abstractions, ad configuration/VAST/event routes, subscriber gating, and deterministic fixture campaigns exist. A running encoder worker, real media assets, CDN, and production ad network are still required. |
| Follow-on 4: billing interfaces and manual grants | Partial production foundation | Plans, subscription view, manual grants, Stripe signature/idempotency/provider boundaries, and webhook route exist. Live Stripe API calls, webhook reconciliation, payment persistence, and secrets are still external prerequisites. |
| Follow-on 5: admin shell and resource management | Partial | Frontend admin shell and movie workspace exist at `/admin` and `/admin/movies`; backend catalog, user, ad campaign/settings, upload metadata, audit, overview, and subscription controls are registered. Full admin forms, upload streaming, and all resource screens remain. |
| Follow-on 6: hardening | Partial | CORS, rate limiting, CSRF/origin checks, security headers, request limits, OpenAPI validation, metrics, Docker, backup scripts, k6/Playwright/axe scaffolding, CI, and performance documentation exist. Optional test packages, browser binaries, k6, deployment credentials, and production telemetry still need installation/configuration. |

## Known limitations

- Catalog, subscription, ad, progress, watchlist, and audit records reset on
  backend restart; auth users/sessions are durable in the configured SQLite file.
- `/ready` is a static readiness placeholder and does not test dependencies.
- `SUPER_ADMIN_EMAIL` is a local bootstrap convenience, not a complete role
  provisioning or invitation system.
- Billing checkout and portal remain unavailable until Stripe credentials and a
  provider implementation are configured; webhook signature validation and
  idempotency are present, but reconciliation is not complete.
- Playback has storage, FFmpeg, and signing boundaries, but the local encoder
  worker and media-serving/CDN path are not yet wired into publishing.
- Ads use deterministic local campaigns and safe fixture VAST responses; they
  do not provide fraud protection, billing, or third-party delivery guarantees.
- Durable audit/catalog/viewer/ads/billing storage, secret rotation, distributed
  sessions, TLS termination, and deployment-level policy still need hardening.
- Vitest, Playwright, axe, and k6 are scaffolded but could not be installed in
  this environment because npm registry access failed with `ECONNRESET`/DNS
  errors; the built-in typecheck, OpenAPI check, smoke test, and production
  builds pass.
