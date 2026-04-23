# Post Launch Checklist

## Core Runtime
- Vercel deployment is green
- production domain resolves to Vercel
- production database is reachable
- Prisma migrations are applied
- Supabase storage buckets exist when media/document storage is expected to work

## Public Website
- homepage loads
- `/umzug`, `/entsorgung`, `/montage`, `/preise`, `/booking`, `/galerie`, `/ueber-uns` load
- no broken public images
- `robots.txt` and `sitemap.xml` are reachable

## Admin And Documents
- admin login works
- documents list loads
- document create/edit flow works
- PDF generation works
- signing approval works
- stale signing links are invalidated after edits

## VPS Shutdown Gate
Do not shut down the VPS until:
1. production PostgreSQL has been migrated to Supabase Postgres
2. Vercel `DATABASE_URL` and `DIRECT_URL` point to Supabase
3. live booking, admin, and document flows were re-tested successfully
