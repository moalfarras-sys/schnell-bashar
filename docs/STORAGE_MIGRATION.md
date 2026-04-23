# Storage Migration

## Current Storage State
- Public website assets: `public/media`
- Admin media uploads:
  - Supabase Storage in production when configured
  - local fallback only for development/non-configured environments
- Documents/private files:
  - document storage abstraction already points toward Supabase-backed handling

## Current Buckets In Code
- `media-public`
- `offers`
- `signed-contracts`
- `expense-receipts`

## Runtime Rules
- no private PDFs in `public/`
- no persistent local filesystem writes required for admin media in production
- `/tmp` remains acceptable only for per-request scratch usage

## Remaining Blocking Migration
The application is not yet safe for full VPS shutdown because PostgreSQL production data is still hosted outside Supabase.

## Database Cutover Plan
1. Prepare Supabase Postgres production project.
2. Set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Supabase `DATABASE_URL`
   - Supabase `DIRECT_URL`
3. Run `npm run setup:storage`
4. Run `npm run db:migrate:supabase` with:
   - `SOURCE_DATABASE_URL` = old VPS Postgres
   - `DIRECT_URL` = Supabase direct DB URL
5. Compare row counts on critical tables.
6. Update Vercel env vars.
7. Rebuild and smoke test production.
8. Shut down VPS only after successful live verification.
