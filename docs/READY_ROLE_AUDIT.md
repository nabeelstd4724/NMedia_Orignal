# Live-readiness role audit

Date: 2026-10-29

The repeatable audit is `backend/src/readiness/role-audit.ts`, included in `npm run test:backend`. It uses isolated repositories and exercises the real Fastify routes with session cookies for each actor.

## Verified access matrix

| Scenario | Normal user | Admin | Super-admin |
|---|---:|---:|---:|
| Browse published catalog | Pass | Pass | Pass |
| Admin movie list | 403 Pass | 200 Pass | 200 Pass |
| Admin overview stats | 403 Pass | 200 Pass | 200 Pass |
| Homepage workspace | 403 Pass | 200 Pass | 200 Pass |
| Audit logs | 403 Pass | 403 Pass | 200 Pass |
| Manual subscription grant | 403 Pass | 403 Pass | 201 Pass |

The frontend admin navigation uses the same role/module policy: editors receive catalog access, admins receive homepage/settings access, and super-admins receive users/audit access.

## Fixed during this readiness pass

- Playback URLs returned by the API are rooted at `/api/v1/...`; the frontend now joins them to the API origin instead of duplicating `/api/v1`, which caused the browser “no supported sources” error.
- Search fields no longer fill with the yellow/lime surface on focus. Focus remains visible through a single lime border.
- Catalog search is debounced, stale requests are aborted, and SQLite production search uses an FTS5 index over slug, title, synopsis and genres.

## Not implemented or still open

1. **Staff invitation flow** — staff accounts still require normal registration followed by super-admin role promotion; there is no invite/reset workflow.
2. **TOTP enforcement at login** — TOTP setup/verify/disable exists, but a staff account with TOTP enabled is not challenged during login.
3. **Viewer library durability** — progress and watchlist repositories are still in-memory in `backend/src/app.ts`; they reset when the process restarts.
4. **Video processing is first-playback work** — uploaded MKV conversion runs when the first viewer requests playback and can return a temporary `VIDEO_NOT_READY`/503. A queued background worker is needed for production scale.
5. **HLS naming mismatch** — the playback response retains the legacy `hlsUrl` field but currently serves signed MP4 media. The new `sourceUrl` is the accurate field; the contract should eventually remove or rename the legacy field.
6. **Payment provider** — the current manual billing gateway intentionally returns “not available” for checkout/portal until a provider is configured.
7. **Homepage merchandising UI** — backend hero scheduling/fallback is present, but the admin page does not yet expose a full multi-slide editor with ordering, active state and date controls.
8. **Subtitle metadata** — extracted subtitle tracks are exposed by language, but forced/default/accessibility metadata is not preserved from the MKV.

These are readiness findings, not claims of completion.
