# NMedia Control Room — requirements audit and implementation checklist

Audit date: **2026-10-24** (Asia/Karachi). Source of truth: **NMedia Admin Panel — Requirements and Features Prompt**, supplied in this conversation. Its feature IDs and Section 5 permission matrix supersede earlier admin specifications.

## Scope and status rules

This is the implementation-pass checklist after the first global-foundations/movie-upload changes. It is not a claim that all 75 requirements are complete. Statuses below distinguish verified behavior from remaining work; command results are recorded in the implementation handoff.

- **Done:** the entire requirement is evidenced. The only Done item here is the negative requirement USR-08: no impersonation feature exists, established by source inspection. An automated no-impersonation regression should still be added during hardening.
- **Partial:** substantive relevant functionality exists, but at least one required UI/API/persistence/security/test element is incomplete. Helper classes, read-only pages, or environment settings alone are not complete admin workflows.
- **Missing:** no operational implementation of the requested feature. A heading, fixture, type, or unrelated public endpoint is not an implemented management feature.
- File paths are relative to `NMedia/`. For Missing items, referenced files are **inspection locations or adjacent foundations**, not claims of implementation. A dash means no implementation file exists.
- Test references below describe assertions already present in source; they are not current run results. **None** means no requirement-specific automated evidence was located.

**Current: 75 IDs — 10 Done, 38 Partial, 27 Missing.**

| Group | IDs | Done | Partial | Missing |
|---|---:|---:|---:|---:|
| Global | 14 | 0 | 9 | 5 |
| Overview | 9 | 0 | 4 | 5 |
| Movies | 13 | 0 | 4 | 9 |
| Homepage | 7 | 0 | 5 | 2 |
| Ads | 9 | 9 | 0 | 0 |
| Users | 9 | 1 | 5 | 3 |
| Settings | 9 | 0 | 6 | 3 |
| Audit | 5 | 0 | 5 | 0 |

## Repository audit

- Read all authored frontend source: App Router pages, admin/viewer/auth/player components, feature hooks, services, CSS, configs and upload-client test. `frontend/public/` is empty. Reviewed backend source, registered routes, services/repositories, upload/media helpers, auth adapter and test source. Reviewed shared contracts, all root database files, documentation, scripts, deployment manifests, CI and test configs. Generated `.next/`, `dist/`, dependency internals, real database contents, private `.env` files, and uploaded user media were excluded from source review.
- Actual stack: npm workspaces; Next.js/React/strict TypeScript; plain CSS and native React forms/hooks/fetch; Fastify with handwritten JSON schemas; better-sqlite3 for auth. No existing standard DataTable, Zod admin form layer or durable all-domain service layer.
- Root and frontend React declarations differ (root 19.x; frontend 18.x). Dependency/build compatibility needs a deliberate test pass, not an unrequested upgrade during this audit.
- Preserve existing tokens from `frontend/src/styles/globals.css` and `viewer-polish.css`: graphite backgrounds, lime `#d8fa56`, gold `#d8ad67`, Manrope / DM Mono / Playfair Display, square bordered panels, numbered navigation. Extend existing components rather than redesign them.
- Runtime users and sessions use `backend/src/database/auth-repository.ts`; completed upload bytes/receipts use `backend/src/media/uploads.ts`. Movies, plans, subscriptions, ads/events, viewer data and audit are in-memory. Homepage is a fixture. `database/migrations/001_initial.sql` contains comments only; no working root migrator or domain schema exists.
- The existing FFmpeg runner is now wired into Ads creative normalization and thumbnail processing; the movie encoding/publishing/playback pipeline and HLS signer remain unfinished. Upload completion is not movie video readiness.
- Git status could not be inspected: `git` was not available in this shell. No commit/diff baseline is claimed.

## Existing verification evidence (inspected only)

| Reference | File and assertions | Limits |
|---|---|---|
| T-SMOKE | `backend/src/smoke.ts`: auth lifecycle, catalog filters, viewer isolation, basic entitlement/ad selection, manual grant, editor list/publish denial, superadmin publish/audit, overview counts | Mostly injected in-memory repositories; no full new permission matrix, durability, admin workflows, readiness or TOTP. Existing editor publish-denial expectation conflicts with the new matrix. |
| T-UPLOAD | `backend/src/media/upload-smoke.ts`: upload auth/CSRF/ownership, byte readback, size/signature/offset rejection, pending cancellation, private original attachment, upload audit count | Synthetic MP4 header tests storage, not decoding; no reconnect/restart resume, worker or playable HLS. |
| T-CLIENT | `frontend/src/services/uploads.smoke.ts`: mocked upload API, format/empty checks, chunk progress, image URL normalization, 429 retry and cleanup | Not a browser/file-picker E2E test. |
| T-HEALTH | `backend/tests/app.test.ts`, test `HTTP foundation / serves health and Prometheus metrics without external services` | Liveness/metrics only; no admin system health. |
| T-AXE | `e2e/smoke.spec.ts`, test `home page loads and has no critical accessibility violations` | Home only; no admin/keyboard/responsive or end-to-end mutation coverage. |
| T-STATIC | Read-only route/service/component inventory and searches for impersonation | Negative-requirement evidence for USR-08; no automated regression yet. |

The root `npm run check` invokes typechecks, a superficial OpenAPI inventory check, backend/upload/client smoke scripts, the Ads beacon smoke and builds. It does **not** invoke lint, Vitest or Playwright/axe, and has no API contract-diff gate. `frontend/package.json` still invokes `next lint`; this must be repaired during implementation. `npm audit --audit-level=low` now passes with zero vulnerabilities. Accessibility compliance and performance targets remain unverified.

## Global shell and shared foundations

| ID | Requirement | Status | Existing files / evidence | Remaining |
|---|---|---|---|---|
| GLB-01 | Admin route guard and identical backend role rules | Partial | `frontend/src/components/layout/AdminShell.tsx`; `backend/src/admin/routes.ts`; `backend/src/auth/repository.ts`; `contracts/src/index.ts` | Added distinct `admin` role compatibility, shared module access matrix and backend role gates for movies/overview/ads/settings. Password/TOTP policy and complete route matrix still need implementation. Typechecks and backend smoke pass. |
| GLB-02 | Permission-filtered, consecutively numbered responsive sidebar | Partial | `frontend/src/components/layout/AdminShell.tsx`; `frontend/src/styles/globals.css`; `contracts/src/index.ts` | Sidebar now filters modules by role and renumbers visible links consecutively; responsive/keyboard acceptance tests and a true mobile drawer remain. |
| GLB-03 | User menu, profile/avatar/password, 2FA, theme and sign out | Partial | `frontend/src/components/layout/AdminShell.tsx`; `frontend/src/features/auth/authStore.ts`; `frontend/src/components/auth/ProtectedAccount.tsx`; `backend/src/auth/routes.ts` | Added interactive role menu, sign out, and staff idle warning surface. Profile editing, password change, 2FA and theme controls remain. |
| GLB-04 | Global keyboard search across titles/users/campaigns/settings | Missing | —; viewer search in `frontend/src/components/layout/Header.tsx` is not admin command search | Add Ctrl+K and / palette, permission-aware real queries and keyboard navigation. None. |
| GLB-05 | Standard server-driven DataTable and complete table controls | Partial | `frontend/src/app/admin/movies/page.tsx`; `frontend/src/app/admin/users/page.tsx`; `frontend/src/services/admin.ts`; `backend/src/admin/routes.ts` | Plain tables; movies fetch fixed limit 50; no 25/50/100 controls, URL filters, sort, columns, selection, bulk/CSV or keyboard grid. Most other lists unpaginated. T-SMOKE checks movie list only. |
| GLB-06 | Zod forms, field errors, unsaved guard, saving states and toasts | Partial | `frontend/src/components/movie/AdminMovieForm.tsx`; `frontend/src/components/movie/MediaUploadField.tsx`; `backend/src/admin/routes.ts` | Native validation/manual checks and saving messages exist, not shared Zod, dirty guard, toasts or server field mapping. T-UPLOAD/T-CLIENT cover upload boundaries only. |
| GLB-07 | Named destructive confirmations and typed irreversible confirmations | Missing | — | Build shared accessible confirm dialogs and backend confirmation checks for irreversible actions. None. |
| GLB-08 | 30-minute idle expiry, 60-second warning and active silent refresh | Partial | `frontend/src/components/layout/AdminShell.tsx`; `frontend/src/features/auth/authStore.ts`; `backend/src/auth/routes.ts`; `backend/src/database/auth-repository.ts` | Admin shell now tracks activity, shows the final-minute warning, signs out after 30 minutes and rotates the session every 10 minutes. Automated idle/replay tests and refresh-family hardening remain. |
| GLB-09 | TOTP setup, QR, recovery and required staff enforcement | Partial | `backend/src/auth/totp.ts`; `backend/src/auth/routes.ts`; `backend/src/database/auth-repository.ts`; `frontend/src/app/admin/settings/page.tsx` | Added secret generation, otpauth URI, six-digit verification, enable/disable routes and Settings UI. Recovery codes, QR rendering, encrypted-at-rest secret handling and required login enforcement remain. TOTP smoke test passes. |
| GLB-10 | 360px+, stacked tables, keyboard/contrast/ARIA accessibility | Partial | `frontend/src/styles/globals.css`; `frontend/src/styles/viewer-polish.css`; `frontend/src/styles/uploads.css`; admin components | Focus/labels/reduced motion exist; tables scroll rather than stack, narrow-screen form/sidebar issues remain. T-AXE is home-only, not admin acceptance. |
| GLB-11 | UTC storage, configured admin zone, relative/exact display | Partial | `frontend/src/app/admin/audit/page.tsx`; `backend/src/admin/audit.ts`; `backend/src/database/auth-repository.ts` | UTC timestamps exist; UI uses browser-local date formatting without configured zone, relative-time/hover utility. None. |
| GLB-12 | Optimistic locking with Reload and Overwrite conflict choices | Missing | —; current admin entities/contracts have no record version | Add conditional writes, conflict responses and permission-checked explicit overwrite. None. |
| GLB-13 | Health-based LIVE indicator polled every 30 seconds | Missing | `frontend/src/components/layout/AdminShell.tsx` is static; `backend/src/routes/health.ts` is unconditional | Wire real status/latency/last-check states; static green is not health evidence. T-HEALTH does not cover this. |
| GLB-14 | Actionable notification counts in header | Missing | — | Add real open-report, failed-encode and seven-day subscription-expiry counts and links. None. |

## Module 01 — Overview (implement last)

| ID | Requirement | Status | Existing files / evidence | Remaining |
|---|---|---|---|---|
| OVR-01 | Time-of-day greeting with admin name | Partial | `frontend/src/components/layout/AdminShell.tsx` | Name works; greeting always says morning. Add configured-timezone boundaries and tests. None. |
| OVR-02 | Four linked stat cards, plan/new-user breakdowns and zeros | Partial | `frontend/src/app/admin/page.tsx`; `backend/src/admin/routes.ts`; `contracts/src/index.ts` | Basic counts exist; no links/pre-filters, plan hover split or new-seven-day count; totals partly fixture/in-memory based. T-SMOKE asserts seeded total only. |
| OVR-03 | Release calendar agenda/month and quick rescheduling | Missing | `frontend/src/app/admin/page.tsx` has only a calendar heading/count message | Add schedule queries, real calendar views/title navigation and reschedule dialog. None. |
| OVR-04 | Views rollups chart/ranges and top five titles | Missing | — | Add persisted rollups/query and chart/date range; progress is not view analytics. None. |
| OVR-05 | Ads KPI summary and top campaign by date range | Missing | —; `backend/src/ads/repository.ts` records events only | Add rollup-backed dashboard analytics. None. |
| OVR-06 | Encoder/disk/backups/jobs system health card | Missing | `backend/src/observability/metrics.ts` provides HTTP counters only | Add operational probes and job/backup history, warnings and links. T-HEALTH covers only liveness/counters. |
| OVR-07 | Ten recent audit events with actor and audit link | Missing | `backend/src/admin/audit.ts` is adjacent groundwork | Add dashboard activity query and widget respecting the new matrix. None. |
| OVR-08 | Manage/Add movie, Add campaign and Grant premium shortcuts | Partial | `frontend/src/app/admin/page.tsx` | Manage-movies links work; remaining distinct role-aware actions absent. None. |
| OVR-09 | 60-second refresh, manual refresh, rollups/cached counts | Partial | `frontend/src/app/admin/page.tsx`; `backend/src/admin/routes.ts` | Initial fetch/error retry only; no timed refresh or cached-count/rollup strategy. None. |

## Module 02 — Movies

| ID | Requirement | Status | Existing files / evidence | Remaining |
|---|---|---|---|---|
| MOV-01 | Full titles table, search/filters/sort/bulk and CSV export | Partial | `frontend/src/app/admin/movies/page.tsx`; `frontend/src/services/admin.ts`; `backend/src/admin/routes.ts`; `backend/src/database/catalog-repository.ts` | Search, status filters, CSV export and durable catalog listing now work. Complete metadata/view/date columns, cast search, advanced filters, UI paging and bulk actions remain. Durable catalog restart/readback is covered by `catalog-smoke.ts`. |
| MOV-02 | Full create/edit tabs: details, media/crop, access/publishing, SEO/notes | Partial | `frontend/src/components/movie/AdminMovieForm.tsx`; `frontend/src/components/movie/MediaUploadField.tsx`; `backend/src/admin/routes.ts`; `backend/src/database/catalog-repository.ts`; `contracts/src/index.ts` | New-movie creation is draft-first, real-backend and durable; artwork and original uploads accept MP4/WebM/MKV, including `video/x-matroska`. Slugs are unique, but editing, expanded metadata, people/genres pickers, cropping, trailer/subtitles, schedule/geo and SEO/notes remain. T-UPLOAD/T-CLIENT and catalog smoke cover the current flow. |
| MOV-03 | Restart/reconnect-resumable uploads, pause/resume/cancel and encoding lifecycle | Partial | `frontend/src/services/uploads.ts`; `frontend/src/components/movie/MediaUploadField.tsx`; `backend/src/media/uploads.ts`; `backend/src/media/upload-routes.ts`; `backend/src/media/ffmpeg.ts`; `backend/src/media/video-provider.ts` | Chunk progress/cancel and completed disk storage work. Pending sessions are in memory; no pause/resume/status recovery, encoding worker/percent/retry, replacement/deletion, duration/renditions. T-UPLOAD/T-CLIENT do not test real video encoding/playback. |
| MOV-04 | Subtitle VTT/SRT upload/conversion, language/default/delete and validation | Missing | —; `backend/src/entitlement/service.ts` returns a fixture subtitle URL only | Add subtitle persistence, secure serving, SRT conversion/timing/encoding checks and UI. None. |
| MOV-05 | Publish readiness checklist and confirmed immediate manual unpublish | Partial | `backend/src/admin/routes.ts`; `backend/src/database/catalog-repository.ts`; `frontend/src/app/admin/movies/page.tsx`; `frontend/src/components/layout/AdminConfirmDialog.tsx` | Direct published creation and publish transitions now reject movies without verified media/artwork; the UI confirms publish/unpublish for super-admins. Full checklist details, editor publishing matrix, content validation and manual-unpublish acceptance tests remain. T-SMOKE covers not-ready rejection and publish audit. |
| MOV-06 | Future scheduling with automatic publish job and System audit | Missing | —; `scheduled` enum in `contracts/src/index.ts` is not scheduling | Add publish time, queue/job, idempotency, audit and calendar integration; never auto-unpublish. None. |
| MOV-07 | Admin draft preview through real playback as free/subscriber | Missing | `backend/src/routes/playback.ts` only reads published movies; local file preview is not viewer preview | Add restricted preview context using actual media/ad/entitlement paths. None. |
| MOV-08 | Metadata duplicate, trash, restore and typed permanent deletion/purge | Missing | —; archived status is not a trash lifecycle | Add repository operations, guards, dialogs, ownership/dependency cleanup and audit. None. |
| MOV-09 | CSV import dry-run/commit and title export | Missing | — | Add per-row validation preview, retry-safe import job and filtered export. None. |
| MOV-10 | Genres CRUD, slug/order/usage and in-use replacement/removal | Missing | `backend/src/routes/catalog.ts` derives public genre strings only | Add managed genre entities, ordering, safe deletes and title relations. None. |
| MOV-11 | People CRUD/photo/bio/usage and merge | Missing | — | Add people/credits, picker, merge transaction and UI. None. |
| MOV-12 | Collections CRUD/cover/ordered titles and homepage integration | Missing | — | Add collections, ordering and row integration. None. |
| MOV-13 | Reports/DMCA/reviews moderation, assignments/notes/unpublish and badges | Missing | — | Add all queues, statuses, actions, reasons and header/tab counts. None. |

## Module 03 — Homepage

| ID | Requirement | Status | Existing files / evidence | Remaining |
|---|---|---|---|---|
| HOM-01 | Title/custom hero slides manager, order/active/schedule | Partial | `frontend/src/app/admin/homepage/page.tsx`; `backend/src/admin/homepage-routes.ts`; `backend/src/database/homepage-repository.ts` | Durable draft editing now supports hero copy and publish/restore. Multiple hero slides, order, active state and scheduling remain. Homepage smoke covers persistence. |
| HOM-02 | Rows CRUD/reorder, manual/collection/auto rules and visibility | Partial | `frontend/src/app/admin/homepage/page.tsx`; `backend/src/admin/homepage-routes.ts`; `backend/src/database/homepage-repository.ts` | Durable draft editing now supports row labels and preserves row payloads. Full row CRUD/reorder, collection/auto rules and visibility controls remain. |
| HOM-03 | Protected Continue Watching/Exclusive built-ins, move/toggle only | Missing | —; `backend/src/routes/viewer.ts` continue-watching is not managed homepage rows | Add built-in identities, placement/toggle and server delete guards. None. |
| HOM-04 | Announcement text/link/style/scheduling/dismissibility | Missing | — | Add draft-backed banner API/editor and viewer rendering. None. |
| HOM-05 | Draft/publish workflow, last ten versions and restore | Partial | `frontend/src/app/admin/homepage/page.tsx`; `frontend/src/services/admin.ts`; `backend/src/admin/homepage-routes.ts`; `backend/src/database/homepage-repository.ts` | Durable draft, publish, last-ten version list and restore-to-draft now work with confirmation. Device/viewer-mode preview and transaction rollback tests remain. |
| HOM-06 | Real draft homepage preview with device/viewer-mode switches | Partial | `frontend/src/app/admin/homepage/page.tsx`; `frontend/src/services/admin.ts` | Current page edits the real draft and shows the published/draft workflow, but does not yet provide device or free/subscriber preview modes. |
| HOM-07 | Publish immediately invalidates cache and audits | Partial | `backend/src/admin/homepage-routes.ts`; `backend/src/database/homepage-repository.ts`; `backend/src/database/audit-repository.ts` | Publish creates a durable version and audit entry. A cache layer/invalidation hook and transactional publish audit remain. |

## Module 04 — Ads

| ID | Requirement | Status | Existing files / evidence | Remaining |
|---|---|---|---|---|
| ADS-01 | Complete editable global ad settings, test mode and subscriber guarantee | Done | `backend/src/admin/routes.ts`; `backend/src/ads/repository.ts`; `backend/src/database/ad-repository.ts`; `backend/src/ads/service.ts`; `backend/src/entitlement/service.ts`; `frontend/src/app/admin/ads/page.tsx`; `backend/src/database/ad-smoke.ts`; `backend/src/smoke.ts` | — |
| ADS-02 | Campaign table with metrics/filters and bulk pause/resume | Done | `frontend/src/app/admin/ads/page.tsx`; `frontend/src/services/admin.ts`; `backend/src/admin/routes.ts`; `backend/src/database/ad-repository.ts`; `backend/src/smoke.ts` | — |
| ADS-03 | Full campaign form, targeting/caps/CPM/status, duplicate/archive | Done | `backend/src/admin/routes.ts`; `backend/src/ads/repository.ts`; `backend/src/database/ad-repository.ts`; `frontend/src/app/admin/ads/page.tsx`; `backend/src/smoke.ts` | — |
| ADS-04 | Safe VAST tag fetch/parse/test with exact diagnostics | Done | `backend/src/ads/vast-diagnostics.ts`; `backend/src/ads/vast-diagnostics-smoke.ts`; `backend/src/admin/routes.ts`; `frontend/src/services/admin.ts`; `frontend/src/app/admin/ads/page.tsx` | — |
| ADS-05 | Hosted creative MP4 upload/limits/normalization/thumbnail/VAST URL | Done | `backend/src/media/uploads.ts`; `backend/src/media/upload-routes.ts`; `backend/src/admin/routes.ts`; `backend/src/ads/creative-processor.ts`; `backend/src/media/ffmpeg.ts`; `backend/src/database/ad-repository.ts`; `frontend/src/app/admin/ads/page.tsx`; `backend/src/ads/creative-processing-smoke.ts` | — |
| ADS-06 | Viewer-equivalent campaign sandbox player | Done | `frontend/src/components/ads/AdSandboxPlayer.tsx`; `frontend/src/features/playback/useAd.ts`; `frontend/src/services/adsService.ts`; `backend/src/ads/vast-diagnostics.ts`; `frontend/src/services/ads.smoke.ts` | — |
| ADS-07 | Per-title/collection exclusions and per-title ad-disable | Done | `backend/src/ads/repository.ts`; `backend/src/database/ad-repository.ts`; `backend/src/ads/service.ts`; `backend/src/entitlement/service.ts`; `backend/src/catalog/repository.ts`; `backend/src/database/catalog-repository.ts`; `backend/src/admin/routes.ts`; `frontend/src/app/admin/ads/page.tsx`; `frontend/src/components/movie/AdminMovieForm.tsx` | — |
| ADS-08 | Rollup reports/chart/date filters/metrics and CSV | Done | `backend/src/ads/repository.ts`; `backend/src/database/ad-repository.ts`; `backend/src/admin/routes.ts`; `frontend/src/services/admin.ts`; `frontend/src/app/admin/ads/page.tsx`; `backend/src/smoke.ts` | — |
| ADS-09 | VAST error counts by code/campaign with last seen | Done | `backend/src/routes/ads.ts`; `backend/src/ads/repository.ts`; `backend/src/database/ad-repository.ts`; `backend/src/admin/routes.ts`; `frontend/src/app/admin/ads/page.tsx`; `backend/src/smoke.ts` | — |

## Module 05 — Users, Plans and Subscriptions

| ID | Requirement | Status | Existing files / evidence | Remaining |
|---|---|---|---|---|
| USR-01 | Accounts table with full profile/plan dates, filters/sort/page/export | Partial | `frontend/src/app/admin/users/page.tsx`; `backend/src/admin/routes.ts`; `backend/src/database/auth-repository.ts`; `backend/src/database/billing-repositories.ts` | User table now includes durable subscription plan/expiry, search, role editing and refresh. Server paging, last-login, CSV and full profile detail remain. |
| USR-02 | User detail/profile, sessions/revoke, subscription/viewing/report/audit history | Missing | —; `frontend/src/components/auth/ProtectedAccount.tsx` is viewer self-account, not admin user detail | Add aggregate detail API and drawer/page; no impersonation. None. |
| USR-03 | Protected user actions, reasons, reset/verify, roles and anonymization | Partial | `backend/src/admin/routes.ts`; `backend/src/database/auth-repository.ts`; `backend/src/auth/routes.ts` | Generic status/role/name PATCH only. No self/last-superadmin/admin-v-superadmin guards, reasons, reset/verify/force logout or anonymization; UI actions absent. No guard tests. |
| USR-04 | Expiring staff invites and pending resend/revoke | Missing | — | Add invite storage, signed single-use acceptance, email and role guards/UI. None. |
| USR-05 | Manual premium grant/start/end/reason, extend/revoke and expiry job | Partial | `backend/src/billing/routes.ts`; `backend/src/entitlement/repository.ts`; `backend/src/entitlement/service.ts`; `backend/src/database/billing-repositories.ts`; `frontend/src/app/admin/users/page.tsx` | Durable plan-aware grants now support duration, expiry-aware counts/entitlement, UI grant and confirmed revoke. Reasons, extension history, expiry job and bulk actions remain. T-SMOKE and durable billing smoke cover expiry. |
| USR-06 | Plans CRUD/features/order and archive-in-use safety; Stripe hidden | Partial | `backend/src/billing/plans.ts`; `backend/src/database/billing-repositories.ts`; `backend/src/billing/routes.ts`; `frontend/src/components/billing/BillingPlans.tsx` | Seeded plans are now durable and read back after restart. Admin plan CRUD, features/order, archive safety and Stripe visibility controls remain. |
| USR-07 | Subscription list/status/source/plan/expiry filters, bulk revoke/export | Missing | —; current-user subscription API does not implement admin listing | Add paginated durable history/query, bulk confirmations and CSV. None. |
| USR-08 | Do not implement impersonation | Done | `backend/src/app.ts`; `backend/src/admin/routes.ts`; `backend/src/auth/routes.ts`; `frontend/src/services/admin.ts`; admin route inventory | T-STATIC: no impersonation routes, session-switch action or UI found. This is a negative feature, not a security certification; add regression coverage during hardening. |
| USR-09 | Deferred payments consistently gated with disabled state | Partial | `backend/src/billing/gateway.ts`; `backend/src/billing/routes.ts`; `frontend/src/components/billing/BillingPlans.tsx`; `frontend/src/components/billing/PaymentsComingSoonDialog.tsx` | Manual gateway returns 501 and dialog exists. No shared persisted feature flag/admin screens; webhook mutation can activate independently of disabled checkout. T-SMOKE tests checkout 501 only. |

## Module 06 — Settings

| ID | Requirement | Status | Existing files / evidence | Remaining |
|---|---|---|---|---|
| SET-01 | General branding/uploads/tagline/support/language/timezone | Partial | `frontend/src/app/admin/settings/page.tsx`; `backend/src/settings/repository.ts`; `backend/src/database/settings-repository.ts`; `backend/src/admin/settings-routes.ts` | Durable site name, tagline, support email and timezone settings now have a real admin editor. Logo/favicon uploads, language and public branding integration remain. Settings smoke covers restart/readback. |
| SET-02 | Playback anonymity/autoplay/resume/TTL/concurrency/quality | Partial | `backend/src/config/env.ts`; `backend/src/settings/repository.ts`; `backend/src/entitlement/service.ts`; `backend/src/media/hls-signing.ts`; `frontend/src/app/admin/settings/page.tsx` | Anonymous watch, session TTL and concurrent-session policy are now persisted/editable. Autoplay/resume/quality controls and signed playback pipeline remain. |
| SET-03 | Registration/verification/password/session/lockout/TOTP policy | Partial | `backend/src/config/env.ts`; `backend/src/auth/routes.ts`; `backend/src/auth/totp.ts`; `backend/src/auth/password.ts`; `backend/src/app.ts` | Cookie TTL/basic validation/global IP rate limit and staff TOTP setup/verification exist. No complete policy editor, account lockout, recovery codes, required-login enforcement or verification. Password hashing uses scrypt, not required Argon2id. T-SMOKE/TOTP smoke cover current behavior. |
| SET-04 | SEO/robots and sanitized versioned Terms/Privacy/DMCA editor | Missing | `frontend/src/app/layout.tsx` has static metadata only | Add stored versions, safe rich-text edit/render and public legal pages; admin noindex also absent. None. |
| SET-05 | Write-only protected SMTP, test email and template editor/preview | Missing | — | Add encrypted/environment secret storage, redaction, superadmin SMTP-secret guard, test delivery and templates. Real SMTP delivery requires deployment configuration. None. |
| SET-06 | Storage usage/disk, concurrency/ladder and FFmpeg check | Partial | `backend/src/config/env.ts`; `backend/src/media/storage.ts`; `backend/src/media/ffmpeg.ts`; `backend/src/media/video-provider.ts` | Storage paths/helper abstractions exist, not operational probes, workers or settings UI. No FFmpeg execution/health evidence. |
| SET-07 | Comments/ratings/maintenance/payments feature flags | Partial | `backend/src/config/env.ts`; `backend/src/billing/gateway.ts`; `frontend/src/components/billing/PaymentsComingSoonDialog.tsx` | Hardcoded disabled billing/basic environment booleans only; no flag service/editor or maintenance message/admin bypass. None. |
| SET-08 | Online backups/list/download/schedule and protected restore/pre-backup | Partial | `backend/src/admin/settings-routes.ts`; `frontend/src/app/admin/settings/page.tsx`; `scripts/backup.sh`; `scripts/backup.ps1`; `scripts/restore.sh`; `scripts/restore.ps1`; `docs/BACKUP_RESTORE.md` | Super-admin online SQLite backup creation and backup listing now use SQLite's backup API and are audited. Download, schedules, typed restore with automatic pre-restore backup and restore tests remain. |
| SET-09 | Superadmin danger zone: trash purge/cache clear/key rotation | Missing | — | Add typed confirmations, guard, atomic changes, key lifecycle and audit; do not delete data during audit. None. |

## Module 07 — Audit

| ID | Requirement | Status | Existing files / evidence | Remaining |
|---|---|---|---|---|
| AUD-01 | Full audit table/links/filters/free text and server paging | Partial | `frontend/src/app/admin/audit/page.tsx`; `backend/src/admin/routes.ts`; `backend/src/admin/audit.ts`; `backend/src/database/audit-repository.ts`; `contracts/src/index.ts` | Server-side action/actor/target/free-text filters and refresh now work. Actor enrichment, links, cursor paging and request metadata remain. |
| AUD-02 | Detail drawer with redacted before/after JSON diff | Partial | `frontend/src/app/admin/audit/page.tsx`; `backend/src/admin/audit.ts` | Audit detail drawer now exposes metadata in a read-only view. Before/after snapshots and redaction policy remain. |
| AUD-03 | Strict read-only UI/API and immutable audit rows | Partial | `frontend/src/app/admin/audit/page.tsx`; `backend/src/admin/audit.ts`; `backend/src/admin/routes.ts`; `backend/src/database/audit-repository.ts` | No HTTP/UI edit/delete path; production rows are durable and query-only through the admin API. Database immutability/rollback tests remain. |
| AUD-04 | Audit every mutation, auth outcome, export/restore and System job | Partial | `backend/src/admin/routes.ts`; `backend/src/billing/routes.ts`; `backend/src/media/upload-routes.ts`; `backend/src/admin/audit.ts` | Selected mutations append after the change, outside a shared transaction. No full before/after/IP/request ID, auth/export/job coverage or persistence. T-SMOKE/T-UPLOAD assert selected entries only. |
| AUD-05 | Filtered CSV export, superadmin-only and itself audited | Partial | `frontend/src/app/admin/audit/page.tsx`; `frontend/src/services/admin.ts`; `backend/src/admin/routes.ts` | Super-admin-only filtered CSV export is implemented and the export action appends an audit event. Full export field redaction and large-result streaming remain. |

**Current implementation note:** `backend/src/database/audit-repository.ts` is now the default production audit store and survives restart; `InMemoryAuditRepository` remains the explicit test double. Filtered query, detail and CSV export are implemented; transactional coupling, redaction and rollback evidence remain open.

## Cross-cutting blockers to acceptance, not excuses to skip IDs

These are remaining acceptance blockers after the current implementation pass:

1. **Permission model still needs full route coverage.** The shared matrix, distinct admin tier, filtered sidebar and protected user-mutation guards now exist. Remaining work is to apply the same matrix to every admin module and add the complete denial matrix test suite.
2. **Publishing still needs the complete checklist.** Direct published creation and dedicated publish now reject missing media/artwork, but content readiness, subtitle/encoding checks, schedule state and full UI acceptance remain.
3. **Auth bootstrap and enforcement still need correction.** Public registration can assign superadmin solely by matching a configured email. Refresh rotation now reaches the SQLite family-revocation path; client idle expiry, warning, periodic refresh and TOTP setup/verification exist, but required login enforcement and recovery codes do not.
4. **Most non-catalog business data is volatile.** `backend/src/app.ts` now wires durable SQLite catalog, auth, audit, plans, subscriptions and ads stores by default; progress/watchlist and several admin resources remain in memory. Mutation and audit insertion are not yet one transaction.
5. **Movie video playback is not complete.** Real uploads save originals, but no movie encoding worker connects them to playable, verified HLS. Entitlement currently fabricates manifest/subtitle URLs; the signer helper is unused. Ads now have hosted/remote creative processing and an admin sandbox, but movie preview/readiness remains blocked.
6. **Manual expiry/plan entitlement is incomplete.** Active expiry and premium qualification now use one tested entitlement rule, and durable grants carry plan/duration/source. Reasons, extension history, scheduled expiry jobs and all admin subscription reporting remain.
7. **Campaign edit path now accepts declared properties.** Durable campaign CRUD and idempotent events are covered by smoke tests; targeting, creative processing, reporting and the full editor UI remain.
8. **Backups are not database-safe.** Current scripts archive/extract directories and do not use SQLite's backup API, typed/pre-restore safeguards or secret exclusions consistently. Do not run them against live user data as an acceptance test.
9. **Documentation and API inventory drift.** README/database docs still describe auth as in-memory in some sections. OpenAPI lacks many registered admin routes, contains mostly empty operations, and the checker only counts/inspects path metadata. It is not generated from Zod and not a contract-diff test.
10. **CI is insufficient for the new definition of done.** No new admin E2E/axe/keyboard/screenshots, full role-denial matrix, version conflicts, last-superadmin tests, durable rollback tests or vulnerability evidence exist. Docker currently starts the API only and defines no durable data volume in Compose. These are implementation tasks, not external-service blockers.

## Next implementation order

1. **Sprint 1 in progress:** finish movie editing, full readiness checks, resumable upload state, and remaining global/audit test evidence.
2. **Sprint 2:** users/subscriptions, ads, homepage, settings and audit workflows.
3. **Sprint 3:** encoding/subtitles, scheduling, overview rollups, command search, notifications and final hardening.

Cross-module GLB dependencies (notification counts, global search sources) must remain Partial until their real source modules and tests exist. Never return invented counts to mark them Done early. After each module, append exact commands, test names, outcomes, changed paths and actual blockers; update each row only after verification.
