# NMedia Admin Panel — three-sprint implementation plan

Updated: **2026-10-24** (Asia/Karachi)

The 75-ID checklist remains the source of truth. Each sprint must leave a
working user-visible slice, real backend persistence or provider boundary, and
focused tests. A feature is not marked Done because a page or endpoint exists.

**Current status:** Ads is complete and evidenced (`ADS-01`–`ADS-09` are Done).
The next implementation module is Movies, followed by Users, Homepage, Settings,
Audit and Overview as requested; media-pipeline hardening remains part of the
later acceptance work.

## Sprint 1 — foundations and movie operations

Goal: make the control room safe to use for day-to-day catalog work.

- Finish global permission coverage, session/TOTP foundations, shared tables,
  forms, confirmations and durable audit storage.
- Move catalog/movie records from process memory to additive SQLite migrations.
- Complete movie create/edit/list/status lifecycle, slug uniqueness, filters,
  CSV export, publish readiness, trash/restore basics, and real upload receipt
  attachment for MP4/WebM/MKV.
- Acceptance: restart the backend and read back a created draft; denied roles
  receive 403s; publish requires verified artwork/media; every mutation has an
  audit entry; `npm run check` passes.

Checklist focus: `GLB-01`–`GLB-12`, `MOV-01`–`MOV-09`, `AUD-01`, `AUD-03`,
`AUD-04`.

## Sprint 2 — operational admin modules

Goal: replace fixture/read-only surfaces with real management workflows.

- Durable users, roles, staff invites, sessions, plans and subscriptions.
- Correct expiry/entitlement behavior and protected super-admin actions.
- Durable ads settings/campaigns, creative metadata, targeting and reporting.
- Durable homepage hero/rows/announcement drafts, versioning, preview and
  publish invalidation.
- Complete settings groups, safe online backups/restore gates and audit search,
  detail and filtered export.

Checklist focus: `USR-01`–`USR-09`, `ADS-01`–`ADS-09`, `HOM-01`–`HOM-07`,
`SET-01`–`SET-09`, `AUD-02`, `AUD-05`.

## Sprint 3 — media pipeline and acceptance hardening

Goal: make the published media workflow production-shaped and prove it.

- Restart/resume upload sessions, FFmpeg job lifecycle, progress/retry,
  HLS renditions, secure manifests/segments and real draft preview.
- Subtitle VTT/SRT validation/conversion, language/default/delete lifecycle.
- Scheduled publishing, release calendar, overview rollups and notifications.
- Genres, people, collections, reports/moderation, command search and health
  indicators.
- Add Playwright/axe/keyboard/responsive tests, role-denial matrix, conflict
  tests, backup/restore tests, security checks and CI gates.

Checklist focus: `MOV-03`–`MOV-13`, `OVR-01`–`OVR-09`, `GLB-04`, `GLB-13`,
`GLB-14`, plus all remaining hardening evidence.

## Working rule

After each module: run the narrowest focused test, run the full project check
when the slice is stable, record exact evidence in `ADMIN_CHECKLIST.md`, and
leave unresolved provider boundaries explicitly marked rather than simulating
success.
