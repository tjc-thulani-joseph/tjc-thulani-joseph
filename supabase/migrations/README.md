# TJC OS Database Migrations

This directory is the source of truth for future TJC OS database schema changes.

## Rules

1. New database schema changes must be added as timestamped migration files.
2. Do not normally modify the live production database manually.
3. Do not rewrite old migrations after they have been deployed.
4. Migrations must be reviewed before production deployment.
5. Supabase Storage remains the physical file layer.
6. Database tables remain the metadata, relationship, permission, and intelligence layer.

## Legacy database scripts

The existing files under `db/` are retained as historical/bootstrap documentation:

- `db/tjc_os_init.sql`
- `db/tjc_os_phase3.sql`
- `db/tjc_os_phase3b_visibility.sql`

They are not being deleted or rewritten as part of the migration-foundation work.

## Target workflow

GitHub
→ Supabase migrations
→ Supabase migration history
→ live database
