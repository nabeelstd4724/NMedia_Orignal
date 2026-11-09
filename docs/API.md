# NMedia API

The backend runs on `http://127.0.0.1:4000` by default. Unless noted, JSON
responses use `{ "data": ... }` on success and
`{ "error": { "code", "message" } }` on failure. Authenticated routes use the
httpOnly cookie named by `AUTH_COOKIE_NAME` (default `nmedia_session`).

## Endpoints

- `GET /health` — process health, returned as `{ "data": { "status": "ok" } }`.
- `GET /ready` — readiness placeholder, returned as `{ "data": { "status": "ready" } }`.
- `GET /api/v1/home` — published homepage content returned as `{ "data": HomeResponse }`. `hero` remains the first/backwards-compatible hero item; `heroes` contains up to eight active, scheduled hero items selected from admin slides or featured published titles. Optional `heroSlides` stores the durable admin slide definitions, including order, active state and start/end schedule. See `contracts/src/index.ts` and `openapi.json` for the response shape.
- `POST /api/v1/auth/register` — creates an account and starts an httpOnly cookie session. Body: `{ "displayName", "email", "password" }` (display name 2–80 characters; password 8–128 characters).
- `POST /api/v1/auth/login` — starts a session using the same body shape.
- `POST /api/v1/auth/logout` — revokes the current session and clears the cookie.
- `GET /api/v1/auth/me` — returns the current user, or a stable `UNAUTHENTICATED` error.
- `POST /api/v1/auth/totp/setup`, `/verify` and `/disable` — staff-only authenticator setup and six-digit verification. Required-login enforcement and recovery codes remain hardening work.
- `GET /api/v1/movies` — published catalog with optional `q`, `genre`, `year`, `access`, `sort` (`title`, `year`, `rating`, `popular`, `newest`, or `alphabetical`), `page`, and `limit` (1–50). Returns `{ data: { movies }, meta: { page, limit, total, totalPages } }`.
- `GET /api/v1/movies/:slug` — one published movie, or `404 MOVIE_NOT_FOUND`.
- `GET /api/v1/movies/:id/playback` — resolves server-side playback entitlement using the auth session cookie. Free titles are allowed with ads when `ALLOW_ANONYMOUS_WATCH=true`; premium titles require an active subscriber (or a past-due subscriber within `PAST_DUE_GRACE_DAYS`). Allowed uploaded-video responses contain a short-lived signed MP4 URL, extracted audio language tracks, WebVTT subtitle tracks, resume position and ad placeholders. MKV uploads are transcoded to browser-compatible H.264/AAC media on first playback. Paywalls contain an `upgradeUrl` and no media URL.
- `GET /api/v1/genres` — distinct genres used by published movies, returned as `{ data: { genres }, meta: { total } }`.
- `PUT /api/v1/me/progress/:movieId` — authenticated idempotent progress upsert. Body: `{ "positionSeconds", "durationSeconds"?, "completed"? }`; only published movies are accepted. Returns `{ data: { progress } }`.
- `GET /api/v1/me/continue-watching` — authenticated, paginated (`page`, `limit`) incomplete progress joined to published movie summaries. Returns `{ data: { movies }, meta }`.
- `GET /api/v1/me/watchlist` — authenticated, paginated (`page`, `limit`) watchlist joined to published movie summaries. Returns `{ data: { movies }, meta }`.
- `GET /api/v1/ads/config?placement=preroll|midroll` — returns global ad settings and a deterministic eligible campaign selection for free viewers; subscribers receive `selected: null`.
- `GET /api/v1/ads/vast/:campaignId` — returns safe hosted VAST XML (`application/xml`) or a third-party tag URL envelope.
- `POST /api/v1/ads/events` — validates and idempotently records `{ eventId, sessionKey, campaignId, event, occurredAt?, errorCode?, errorMessage? }`; replaying the same session/event key is accepted as a duplicate.
- `POST /api/v1/me/watchlist/:movieId` — authenticated idempotent add for a published movie. Returns `{ data: { movieId, addedAt } }`.
- `DELETE /api/v1/me/watchlist/:movieId` — authenticated idempotent removal. Returns `{ data: { movieId, removed: true } }`.
- `GET /api/v1/plans` — active plans. The fixture contains `free` and `premium-monthly`.
- `GET /api/v1/me/subscription` — authenticated subscription view; users without a record receive the free plan.
- `POST /api/v1/billing/checkout` — authenticated `{ "planId" }`; validates the plan and returns `501 NOT_AVAILABLE` from the local manual gateway.
- `POST /api/v1/billing/portal` — authenticated provider-portal boundary; returns `501 NOT_AVAILABLE` locally.
- `POST /api/v1/admin/subscriptions/grant` — super-admin-only `{ "userId", "planId"? }`; returns the subscription and actor/action/target audit fields.
- `POST /api/v1/admin/subscriptions/revoke` — super-admin-only `{ "userId" }`; returns a revocation result and audit fields.
- `GET /api/v1/admin/stats/overview` — authenticated editor or super-admin overview counts for movies, users, and active subscriptions.
- `GET /api/v1/admin/movies` — authenticated editor or super-admin catalog listing, including unpublished statuses, with `status`, `q`, `page`, and `limit` filters.
- `POST /api/v1/admin/movies` — authenticated editor or super-admin movie creation; new movies default to `draft`.
- `POST /api/v1/admin/movies/:id/publish` and `/unpublish` — super-admin-only status mutations.
- `GET /api/v1/admin/audit-logs` — super-admin-only immutable in-memory mutation audit entries.
- `GET /api/v1/admin/users` and `PATCH /api/v1/admin/users/:id` — super-admin user listing and role/status/display-name CRUD (password hashes are never returned).
- `GET|PUT /api/v1/admin/ads/settings` and `GET|POST|PATCH|DELETE /api/v1/admin/ads/campaigns[:id]` — RBAC-protected ad configuration and campaign CRUD; all writes append audit entries.
- `GET /api/v1/admin/ads/report` and `GET /api/v1/admin/ads/errors` — admin-only persisted campaign metrics/error rollups with optional `from` and `to` ISO timestamps.
- `GET /api/v1/admin/ads/report/export` — super-admin-only CSV export of the filtered ad report; the export is audited.
- `POST /api/v1/admin/ads/campaigns/:id/vast-diagnostics` — admin-only hosted/remote VAST validation with SSRF-safe URL checks, redirect blocking, response limits and structured diagnostics.
- `GET /api/v1/admin/ads/campaigns/:id/creative-status`, `POST /api/v1/admin/ads/campaigns/:id/process` and `/process/retry` — super-admin-controlled hosted creative encode status, retry and artifact generation.
- `GET|POST /api/v1/admin/ads/exclusions` and `DELETE /api/v1/admin/ads/exclusions/:id` — durable title/collection ad exclusions enforced by server-side playback planning.
- `POST /api/v1/admin/uploads` — validated upload metadata boundary; storage/CDN is intentionally injected later.
- `POST /api/v1/admin/media/uploads` — real file upload session (editor/admin/super-admin). JSON `{ filename, kind: "image"|"video", contentType, size }` returns `{ data: { id, chunkSize } }`. Movie files accept MP4, WebM and MKV (`video/x-matroska` or `video/matroska`).
- `PUT /api/v1/admin/media/uploads/:id?offset=N` — send the next binary chunk with `Content-Type: application/octet-stream`. Returns `{ data: { offset } }`. Chunks are bounded to 4 MiB and only the uploading user can write them.
- `POST /api/v1/admin/media/uploads/:id/complete` — validates declared size and file signature, then returns a durable upload receipt. Images have an API-relative `url`; movie originals deliberately do not.
- `DELETE /api/v1/admin/media/uploads/:id` — cancels that user's pending upload, removing its partial bytes. Does not delete completed files.
- `GET /api/v1/media/images/:id` — serves a completed image with its verified content type and caching headers. Never serves video originals.
- `POST /api/v1/billing/webhooks/stripe` — verifies Stripe `t=...,v1=...` HMAC signatures and claims event IDs idempotently. Configure `STRIPE_WEBHOOK_SECRET`; provider checkout/portal calls remain behind `BillingGateway`/`StripeProvider` interfaces.

Auth success responses use `{ "data": { "user": { "id", "email", "displayName", "role", "createdAt" } } }` and errors use `{ "error": { "code", "message" } }`. Invalid request bodies return `400 VALIDATION_ERROR`; invalid credentials return `401 INVALID_CREDENTIALS`.

Admin endpoints use the session user's role (`user`, `editor`, `admin`, or `super_admin`). Editors can work with movie content and overview data; admins also receive Homepage, Ads and Settings access; user administration, subscription mutations, publishing, unpublishing and audit-log reads require a super admin. Successful movie and billing mutations append an audit entry.

Auth users/sessions, catalog movies, plans, subscriptions, ad settings/campaigns/events and audit rows use SQLite-backed repositories by default; tests can inject in-memory repositories. Passwords use Node's built-in scrypt and are never logged. Sessions use random opaque tokens in an httpOnly, same-site cookie; production also marks the cookie secure. To bootstrap a local super-admin, set `SUPER_ADMIN_EMAIL` before registering that email against a fresh process.

The catalog currently uses `backend/src/catalog/repository.ts`, an in-memory `CatalogRepository` seeded with realistic movies. Public catalog routes filter out every status except `published`; the repository is the replacement boundary for persistent catalog storage.

## Choosing artwork and movie files

In **Admin → Movies → New movie**, use **Choose from computer** for the poster,
backdrop and optional movie original. Image URLs are filled automatically after
upload; external image URLs remain supported. The UI provides image/video
previews, progress, cancel, file-type errors, and disables saving while uploading.

- Images: JPEG, PNG, WebP; maximum 10 MiB. SVG/HTML are not accepted.
- Movies: MP4, WebM or MKV containers; maximum 2 GiB. Codec support for the local
  preview depends on the browser. File signature validation is not a virus scan
  or a full decode/transcoding pass.
- Completed bytes and metadata are under `MEDIA_ROOT/uploads/` (normally
  `backend/data/media/uploads/` when starting with the backend workspace script).
  Generated UUIDs, not client filenames, are used on disk. Keep this directory
  private; do not expose it as an unrestricted static directory.
- Movie creation accepts optional `videoUploadId`; it must identify a completed
  video uploaded by the signed-in creator. The admin list shows **Original
  uploaded**. This stores/attaches the original; it does not create HLS renditions
  or make an original publicly playable.
- Artwork is publicly accessible by its generated URL even while a movie is a
  draft. Do not upload confidential artwork.
- Upload files/receipts survive server restart. Catalog drafts still use the
  existing in-memory catalog and do not survive restart. Pending upload sessions
  expire after 24 hours and must be restarted after a backend restart; abandoned
  `.part` files from a crashed process may require operator cleanup.
- The old `/admin/uploads` metadata-only API is retained for compatibility;
  the movie form uses the new binary-upload flow above.

Playback entitlement currently uses `backend/src/entitlement/service.ts` and an in-memory subscription repository. `InMemorySubscriptionRepository.grant()` is a deterministic test/admin helper and is not exposed as an HTTP endpoint. Playback responses never expose catalog or subscription records.

Ads use `backend/src/ads/repository.ts` and `backend/src/ads/service.ts`. Campaigns are filtered by active window and placement, then selected by highest priority and stable weighted hashing. Global controls are configured with `ADS_ENABLED`, `MIDROLL_INTERVAL_MIN`, `SKIP_AFTER_SEC`, `MAX_ADS_PER_SESSION`, and `FALLBACK_VAST_TAG_URL`.

Viewer progress and watchlist use `backend/src/viewer/repository.ts` in-memory interfaces. Records are keyed by authenticated user ID and reset when the process restarts. Viewer routes use the same `UNAUTHENTICATED`, `MOVIE_NOT_FOUND`, and `VALIDATION_ERROR` envelopes as the rest of the API.

Set `HOST`, `PORT`, `NODE_ENV`, `LOG_LEVEL`, auth/session controls, playback
controls, ad controls, `FALLBACK_VAST_TAG_URL`, and `SUPER_ADMIN_EMAIL` using
the environment. The authoritative example is `backend/.env.example`.

The API is a local implementation boundary, not a production deployment. It
uses env-driven in-memory rate limiting, an explicit CORS origin allow-list,
origin checks for cookie-backed mutations, security headers, request body and
timeout limits. The deterministic contract is published in `openapi.json` and
validated by `npm run check:openapi`. Durable storage, provider webhooks,
CDN/DRM media delivery, and durable audit logs remain outside this phase.
