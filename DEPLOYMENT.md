# Deployment

## Target
- Platform: Vercel
- Canonical host: `https://schnellsicherumzug.de`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `.next`

## Required Environment Variables
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_BASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `SIGNING_TOKEN_SECRET`
- `PDF_RENDER_SECRET`

## Pre-Deploy Checks
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run test:unit`
4. `npm run build`

## Storage
- public website images: `public/media`
- production admin media: Supabase Storage bucket `media-public`
- document buckets:
  - `offers`
  - `signed-contracts`
  - `expense-receipts`

## Database
- Current code is ready for Supabase Postgres cutover.
- Full VPS shutdown is only safe after:
  - migrating source PostgreSQL data
  - updating `DATABASE_URL` and `DIRECT_URL` on Vercel
  - running live smoke tests

## Useful Commands
- create storage buckets: `npm run setup:storage`
- migrate DB to Supabase: `npm run db:migrate:supabase`
- regenerate image slot map: `npm run slots:discover`
