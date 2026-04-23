# Schnell Sicher Umzug

Production business website and admin system for:
- Umzug
- Entsorgung
- Möbelmontage / Küchenmontage
- booking / inquiry handling
- document generation
- admin approval before signature

## Stack
- Next.js 16 App Router
- TypeScript
- Prisma + PostgreSQL
- Supabase Storage
- Vercel deployment target

## Commands
- `npm ci`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run test:unit`
- `npm run slots:discover`
- `npm run images:check`
- `npm run images:forbidden`

## Production Notes
- public assets live in `public/media`
- private documents must not live in `public/`
- customer signing requires explicit admin approval
- safe VPS shutdown still requires database cutover to Supabase Postgres

See:
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [VERCEL_DOMAIN_MIGRATION.md](VERCEL_DOMAIN_MIGRATION.md)
- [SEARCH_CONSOLE_CHECKLIST.md](SEARCH_CONSOLE_CHECKLIST.md)
- [docs/AUDIT_CURRENT_ARCHITECTURE.md](docs/AUDIT_CURRENT_ARCHITECTURE.md)
