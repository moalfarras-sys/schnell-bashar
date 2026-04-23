# Cleanup Report

## Summary
This cleanup round focused on media integrity, unsafe example configuration, and Vercel runtime compatibility.

## Files Intentionally Kept Deleted
- `public/media/gallery/1.jpeg`
- `public/media/gallery/2.jpeg`
- `public/media/brand/company-signature.jpeg`
- `public/media/brand/company-signature-clean.png`

Reason:
- the deletions in the working tree were intentional
- public references were updated to current assets instead of restoring obsolete files

## Files Updated
- `.env.example`
- `next.config.ts`
- `public/media/README.md`
- `scripts/discover-image-slots.ts`
- `scripts/generated/image-slots-map.json`
- `scripts/image-fallback-map.ts`
- `scripts/migrate-to-supabase.ts`
- `scripts/setup-supabase-storage.ts`
- `src/app/(marketing)/galerie/page.tsx`
- `src/app/(marketing)/ueber-uns/page.tsx`
- `src/app/api/admin/media/route.ts`
- `src/app/api/admin/media/[id]/crop/route.ts`
- `src/lib/supabase.ts`
- `src/server/content/slots.ts`
- `src/server/pdf/company-seal-assets.ts`
- `src/server/storage/hard-delete-assets.ts`

## New Files Added
- `src/server/media/storage.ts`

## Ignored Files Confirmed
- `.env`
- `.env.*`
- `.next/`
- `.vercel/`
- `node_modules/`
- `tmp/`
- `*.log`
- `*.pid`
- `*.tsbuildinfo`
- `public/uploads/`

## Legacy Files Still Kept
- `Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `nginx.conf`
- `ecosystem.config.cjs`

Reason:
- they are still useful as historical migration reference
- they are no longer the target production deployment path

## Dependency Cleanup
- no package removals were applied in this round
- existing dependencies were kept because document/admin/build paths still rely on them

## Remaining Owner / Ops Decisions
- provide production Supabase Postgres credentials for final VPS shutdown
- decide whether old VPS deployment notes should be archived permanently or deleted in a later cleanup
