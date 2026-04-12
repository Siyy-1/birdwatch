# BirdWatch DB Migrations

This repository now has two migration paths.

## 1. Fresh local database

`docker compose up` initializes PostgreSQL from `db/migrations` only on first boot of a new volume.

- Fresh volume: all SQL files in `db/migrations/` run automatically.
- Existing volume: new SQL files do not run automatically.

That means `docker-entrypoint-initdb.d` is not enough once a database already exists.

## 2. Existing database

Use the backend migration runner.

From `backend/`:

```powershell
npm run db:migrate:doctor
npm run db:migrate:status
```

Commands:

- `npm run db:migrate:doctor`
  - Shows whether core tables exist.
  - Shows whether RESUME-related columns are present.
  - Shows whether `schema_migrations` tracking exists.
- `npm run db:migrate:status`
  - Lists each migration as `applied`, `pending`, or `changed`.
- `npm run db:migrate`
  - Applies all pending migrations in filename order.
- `npm run db:migrate:baseline -- --through <migration-file>`
  - Marks old migrations as already applied without executing them.
  - Use this only when the target database already contains the schema from those files.

## Bootstrap procedure for a legacy database

If a database existed before `schema_migrations` tracking was added:

1. Run `npm run db:migrate:doctor`.
2. Decide the last migration that is already reflected in the database.
3. Baseline through that file.
4. Run `npm run db:migrate`.
5. Run `npm run db:migrate:status` and `npm run db:migrate:doctor` again.

Example for a DB that already has gallery tables but does not yet have the 2026-04-11 changes:

```powershell
npm run db:migrate:baseline -- --through 20260408_000011_create_gallery_tables.sql
npm run db:migrate
```

## Verification checklist for the current RESUME.md changes

After applying pending migrations, verify:

- `users.terms_agreed_at` is nullable
- `users.privacy_agreed_at` is nullable
- `sightings.location` is nullable
- `users.ai_training_opt_in` exists
- `users.ai_training_opt_in_at` exists
- `ai_feedback` table exists

Operational smoke checks:

- `POST /api/v1/users/me/onboarding` works for users created before onboarding completion
- `POST /api/v1/sightings` works without `lat/lng` when GPS consent is off
- `POST /api/v1/sightings` can insert AI feedback rows when AI review data is included

## Current limitation

Production deployment does not yet run DB migrations automatically.

- `docker compose` only covers first-time local DB init
- backend CI deploys ECS without a migration step
- terraform apply provisions infra but does not apply app SQL migrations

Until deployment automation is added, migration apply/verify is an explicit release step.
