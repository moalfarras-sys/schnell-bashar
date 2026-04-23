# Current Architecture Audit

## Repository Summary
- Project: `schnell-sicher-umzug`
- Framework: `Next.js 16.1.6`
- Routing: App Router under `src/app`
- Language: TypeScript
- Package manager: `npm`
- Lockfile: `package-lock.json`
- Build command: `npm run build`
- Output: `.next`
- Deployment target: Vercel

## Core Stack
- UI: React 19 + Tailwind CSS 4
- ORM: Prisma 7
- Database: PostgreSQL
- Storage:
  - public website assets in `public/media`
  - Supabase Storage already integrated for some document flows
  - admin media uploads now support Supabase-backed public media storage
- PDF/document rendering:
  - legacy production PDFs still rely on `pdfkit`
  - new document renderer abstraction exists for HTML/CSS + Chromium sample rendering
- Auth: custom admin cookie/JWT session via `jose`
- Email: Nodemailer SMTP

## Current Routing Model
- Marketing pages: `src/app/(marketing)`
- Booking/wizard flows:
  - `src/app/(marketing)/booking`
  - `src/app/(wizard)/buchen`
  - `src/app/booking-v2`
- Admin routes: `src/app/admin`
- API routes: `src/app/api`

## Database And Business Models
- Main operational models:
  - `Order`
  - `Offer`
  - `Contract`
  - `Invoice`
  - `Quote`
  - `AuditLog`
- New document workflow models are present for:
  - `Document`
  - `DocumentVersion`
  - `DocumentLineItem`
  - `DocumentNumberSequence`
  - `SigningToken`
  - `DocumentSignature`

## Admin Architecture
- Admin auth:
  - `src/server/auth/admin-session.ts`
  - `src/server/auth/require-admin.ts`
- Admin UI areas already present:
  - orders
  - offers/contracts
  - accounting
  - documents
  - media/content
  - settings/users/roles/audit

## Public Media Architecture
- Public branding/gallery assets remain in:
  - `public/media/brand`
  - `public/media/gallery`
- Broken legacy references to deleted files were found and repaired:
  - `/media/gallery/1.jpeg`
  - `/media/gallery/2.jpeg`
  - deleted public signature image assets
- Runtime slot resolution now ignores missing local public files and falls back to valid replacements.

## Document And Signature Workflow
- Old unsafe behavior was previously identified:
  - customers could reach signable flows too early
- Current approval-gated document routes exist:
  - `/admin/dokumente`
  - `/api/admin/documents/*`
  - `/dokumente/unterschrift/[token]`
  - `/api/documents/sign/[token]`
- Requirement remains enforced:
  - no customer signature before explicit admin approval
  - edited approved documents require fresh approval and fresh signing token

## Major Bugs And Risks Found In This Audit Round
- `public/media` contained intentional deletions in the working tree; public references still pointed to deleted files
- admin media upload and crop routes still wrote to `public/uploads/media`, which is not Vercel-safe
- generated image slot map still referenced deleted gallery/signature files
- `.env.example` contained unsafe real-like values and had to be sanitized
- runtime still depends on PostgreSQL outside Vercel; safe VPS shutdown is blocked until DB cutover completes

## Fixes Applied In This Round
- Replaced deleted public image references on:
  - `ueber-uns`
  - `galerie`
- Added runtime fallback mapping for removed gallery images
- Hardened slot resolution to ignore missing local files instead of serving broken paths
- Converted admin media upload/crop runtime to:
  - Supabase Storage when configured
  - local dev fallback only when Supabase is not configured
- Added `media-public` storage bucket constant and updated storage setup script
- Regenerated `scripts/generated/image-slots-map.json`
- Sanitized `.env.example`

## SEO Findings
- Public canonical host remains `https://schnellsicherumzug.de`
- `robots.txt` and `sitemap.xml` exist
- query/canonical leakage was already reduced in earlier work
- this round mainly repaired media integrity and removed broken asset references

## Storage Findings
- Public website assets:
  - `public/media`
- Private/business document storage:
  - Supabase Storage abstraction exists in document code
- Remaining blocker:
  - production database is still not cut over to Supabase Postgres

## Vercel Readiness Status
- Vercel build passes
- image checks pass
- lint passes
- typecheck passes
- admin media runtime no longer requires persistent local filesystem in production if Supabase is configured
- full VPS retirement is still blocked by database migration only

## Cleanup Candidates Confirmed
- deleted root docs from old VPS/Hostinger phase can be replaced with smaller Vercel-first docs
- deleted gallery/signature assets should stay deleted
- tracked `tsconfig.tsbuildinfo` should be removed from git if still tracked historically

## Exact Implementation Strategy From Here
1. Keep public media clean and repo-based only.
2. Keep admin runtime media on Supabase Storage in production.
3. Recreate root docs as Vercel-first documentation.
4. Keep document approval gate unchanged and verified.
5. Migrate production PostgreSQL from VPS to Supabase Postgres.
6. Update Vercel `DATABASE_URL` / `DIRECT_URL`.
7. Re-run smoke tests on live domain.
8. Only then shut down the VPS safely.
