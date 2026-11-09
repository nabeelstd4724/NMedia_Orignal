# Database

Database concerns are intentionally kept outside `backend/`. Sprint 2 Phase 0/1
reserves this directory for the SQLite connection and ordered migrations. The
home endpoint currently uses a local fixture, so no database connection is
opened at runtime yet.

When persistence is introduced, migrations should be applied in filename order
and remain safe to run more than once. Keep SQL in `migrations/` and keep the
runtime adapter in the backend database module.
