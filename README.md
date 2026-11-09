# NMedia

NMedia is a cinematic streaming platform prototype. It is a small TypeScript
monorepo with a Next.js frontend, a Fastify backend, and a shared contracts
package. The current runtime deliberately uses in-memory repositories and
local fixtures so the UI and HTTP boundaries can be reviewed before persistence
and external providers are introduced.

## Prerequisites

- Node.js 22 or newer
- npm (the repository lockfile is used by CI)

Install all workspace dependencies from the repository root:

```bash
npm ci
```

## Local setup and runbook

Copy the examples before starting services:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

On Windows PowerShell, use `Copy-Item` instead. The frontend only needs
`NEXT_PUBLIC_API_BASE_URL`; the backend defaults to `127.0.0.1:4000`.

Start each process in a separate terminal from the repository root:

```bash
npm run dev:backend   # Fastify API on http://127.0.0.1:4000
npm run dev:frontend  # Next.js on http://localhost:3000
```

The frontend falls back to its local preview fixture when the API is not
available. For an API-backed run, keep both processes running and ensure the
frontend API URL includes `/api/v1`.

### Local admin setup

There is no seed command or persistent user database yet. For a local
super-admin, set `SUPER_ADMIN_EMAIL` in `backend/.env`, start a fresh backend,
and register that exact email through the frontend or HTTP API. Registration
assigns `super_admin` when the normalized email matches the setting. The role
is process-local and all accounts disappear when the backend restarts.

Do not use a production address or secret in local examples. The manual admin
subscription endpoints are documented in [`docs/API.md`](docs/API.md).

### API health checks

With the backend running, check liveness and readiness:

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4000/ready
curl http://127.0.0.1:4000/api/v1/home
```

Expected health responses are JSON envelopes with `data.status` equal to
`ok` and `ready`. These checks confirm process/routing availability only;
`/ready` is currently a placeholder and does not verify a database or provider.

## Checks and builds

Run the complete local gate from the repository root:

```bash
npm run check
```

This runs TypeScript checks for frontend, backend, and contracts; the backend
HTTP smoke test; and production builds for frontend and backend. Individual
commands are available as `npm run typecheck:*`, `npm run test:backend`,
`npm run build:frontend`, and `npm run build:backend`.

## Architecture boundaries

- `frontend/` owns the Next.js App Router UI and browser API client.
- `backend/` owns HTTP routing, validation, auth/session handling, entitlement,
  catalog, ads, billing boundaries, and response envelopes.
- `contracts/` contains types shared by the UI and backend; it has no runtime
  server responsibilities.
- `database/` is reserved for the future persistence adapter and migrations;
  it is not opened by the current server.
- `backend/src/*/repository.ts` files are replacement seams for persistence.
  Current implementations are in-memory and reset on process restart.
- External billing, hosted media, durable identity, and production deployment
  remain integration boundaries. Current routes return a stable `501` for
  unavailable billing provider operations where applicable.

See [`docs/API.md`](docs/API.md) for the implemented HTTP surface and
[`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) for the
brief-to-repository status map.
## Durable auth and local media

The backend uses SQLite at `DATABASE_PATH` (default `./data/nmedia.sqlite`) for users and hashed, rotating session tokens. The session cookie is httpOnly; `POST /api/v1/auth/refresh` rotates it and detects reuse of revoked tokens. Set `HLS_SIGNING_SECRET` to a random deployment secret.

Local media foundations live under `backend/src/media`: `LocalStorageService`, `LocalVideoProvider`, `FfmpegRunner`, and `HlsUrlSigner` provide filesystem storage, provider boundaries, FFmpeg job execution, and expiring signed HLS paths without requiring a cloud vendor.
