# Audit: Current Architecture

## Project Snapshot
- Project: `schnell-sicher-umzug`
- Framework: `Next.js 16.1.6`
- Routing: `App Router` under `src/app`
- Language: `TypeScript`
- Package manager: `npm`
- Lockfile: `package-lock.json`
- Build command: `npm run build`
- Start command: `npm run start`
- Default output: `.next`
- Legacy Linux-only standalone sync exists in `package.json` and `next.config.ts`

## Detected Stack
- UI: React 19 + Tailwind CSS 4
- ORM: Prisma 7
- Database: PostgreSQL
- Storage: mixed
  - Supabase Storage already used for offers, signed contracts, expense receipts
  - local filesystem still used in some runtime paths
- Email: Nodemailer SMTP
- Auth: custom admin JWT cookie auth via `jose`
- PDF: `pdfkit`
- Signature: internal fallback signing exists, legacy DocuSign integration still present

## Routing And App Structure
- Public marketing routes live under `src/app/(marketing)`
- Booking wizard routes exist in both:
  - `src/app/(marketing)/booking`
  - `src/app/(wizard)/buchen`
  - `src/app/booking-v2`
- Admin routes live under `src/app/admin`
- API routes live under `src/app/api`

## Admin Surface
- Admin login:
  - `src/app/admin/login`
- Admin auth/session:
  - `src/server/auth/admin-session.ts`
  - `src/server/auth/require-admin.ts`
  - `src/server/auth/admin-users.ts`
- RBAC:
  - `src/server/auth/admin-permissions.ts`
- Existing admin business areas:
  - orders
  - offers/contracts
  - accounting/invoices/expenses
  - availability/calendar
  - catalog/services/pricing/promos
  - media/content
  - users/roles/audit

## Database And Data Model
- Prisma schema: `prisma/schema.prisma`
- Existing key business models:
  - `Order`
  - `Offer`
  - `Contract`
  - `Invoice`
  - `InvoiceItem`
  - `Payment`
  - `Quote`
  - `QuoteEvent`
  - `DocumentSequence`
  - `AuditLog`
- Current money strategy is integer cents in core financial models
- Current document numbering exists but is split across legacy scopes and helpers

## Booking And Inquiry Flow
- Main write endpoint: `src/app/api/orders/route.ts`
- Flow detected:
  1. Customer submits booking/inquiry
  2. `Order` is created
  3. `Offer` is created automatically
  4. Offer PDF is generated
  5. Offer email is sent
  6. Tracking page exists for inquiry/order follow-up
- Tracking pages:
  - `src/app/(marketing)/anfrage/[code]/page.tsx`
  - `src/app/api/tracking`

## Pricing And Calculator Flow
- Server-side pricing:
  - `src/server/calc/estimate.ts`
  - `src/server/pricing/runtime-config.ts`
  - `src/server/offers/promo-rules.ts`
- Public estimate tools:
  - `src/app/(marketing)/preise`
  - `src/app/booking-v2/lib/pricing.ts`
- Quote handoff exists through `Quote` and `QuoteEvent`

## Existing PDF / Export / Signature Logic
- PDF generation is implemented with `pdfkit`
- Current generators:
  - `src/server/pdf/generate-offer.ts`
  - `src/server/pdf/generate-contract.ts`
  - `src/server/pdf/generate-invoice.ts`
  - `src/server/pdf/generate-agb.ts`
  - `src/server/pdf/generate-quarterly-report.ts`
- Current signing/public contract flow:
  - `src/app/api/offers/[offerId]/accept/route.ts`
  - `src/app/sign/contract/page.tsx`
  - `src/app/api/contracts/sign/fallback/route.ts`
- Problem confirmed:
  - accepting an offer creates a contract and a signing URL immediately
  - manual admin contract creation creates a signing URL immediately
  - signing page can refresh or recreate pending links
  - this violates the required admin approval gate

## Auth And Protection
- Admin protection exists and is reusable
- Session secret env currently named `SESSION_SECRET`
- Password bootstrap still supports `ADMIN_PASSWORD` fallback, which should be removed from production examples
- Admin routes are not universally permission-hardened yet, but the base mechanism exists

## Environment Variables Detected
- Database:
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `LOCAL_DATABASE_URL`
  - `DB_CONNECTION_LIMIT`
  - `DB_POOL_TIMEOUT`
  - `DATABASE_SSL_REJECT_UNAUTHORIZED`
- Site:
  - `NEXT_PUBLIC_BASE_URL`
  - `NEXT_PUBLIC_GA_ID`
- Auth/admin:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD_HASH`
  - `ADMIN_PASSWORD`
  - `SESSION_SECRET`
- Email:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `MAIL_FROM`
  - `MAIL_REPLY_TO`
  - `ORDER_RECEIVER_EMAIL`
- Storage:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Distance/routing:
  - `ORS_API_KEY`
  - `ORS_BASE_URL`
- Legacy DocuSign:
  - `DOCUSIGN_*`
- Signing/offer:
  - `OFFER_VALIDITY_DAYS`
  - `SIGNING_LINK_TTL_HOURS`

## Storage System Findings
- Public static brand/gallery media are under `public/media`
- Runtime-generated private or semi-private files still leak into public/local paths:
  - `public/uploads/contracts`
  - `public/uploads/signed-contracts`
  - generic `public/uploads`
- Supabase Storage is already used in some flows, but not consistently enforced
- Vercel blocker: production runtime cannot depend on persistent local filesystem

## SEO Findings
- `src/app/robots.ts` exists and is broadly correct
- `src/app/sitemap.ts` currently includes non-canonical and private/thin pages such as `/anfrage`
- Navigation still links to query URLs like `/booking?context=MOVING`
- Root metadata still contains mixed legacy wording and mojibake
- Domain references still include old host `schnellumzug-berlin.de` in docs and env examples
- Public pages lack a fully consistent canonical and page-specific metadata strategy
- Homepage shows hardcoded testimonial content that cannot be verified as real reviews

## Legal And Trust Findings
- Legal pages exist:
  - `agb`
  - `datenschutz`
  - `impressum`
- Requires cleanup for German quality and consistency
- Must avoid fake trust claims, fake reviews, and unsupported legal/e-signature claims

## Security Findings
- Local env files exist in workspace:
  - `.env`
  - `.env.production`
  - `.env.bak.20260405-103127`
- `git ls-files` currently shows env examples only, which is good
- Tracked runtime/log/artifact clutter still exists in git:
  - log files
  - pid files
  - `offer-preview.pdf`
  - files under `tmp`
- Private PDF/runtime files must not remain tracked or be generated to public paths

## Vercel Blockers
- Runtime writes to `public/uploads`
- Mixed deployment documentation still points to VPS/Hostinger/PM2/nginx
- PDF engine is not abstracted for serverless Chromium rendering
- Signature flow is state-unsafe and not admin-gated
- Local file assumptions remain in uploads and signed PDF flows

## Cleanup Candidates
- Untrack from git:
  - `.next-dev.log`
  - `.next-dev.pid`
  - `next-dev.log`
  - `next-dev.err.log`
  - `dev-run.log`
  - `dev-run.err.log`
  - `dev-restart.log`
  - `offer-preview.pdf`
  - `tmp-remote-cmd.txt`
  - `tmp/contract-preview.pdf`
  - `tmp/contract-preview-clean.pdf`
- Keep temporarily as legacy docs/infra references:
  - `Dockerfile`
  - `docker-compose.yml`
  - `docker-compose.prod.yml`
  - `nginx.conf`
  - `ecosystem.config.cjs`

## Files That Must Be Migrated Before Legacy Removal
- Any runtime file generation under `public/uploads`
- Any contract/signature download logic pointing directly to public URLs
- Any deployment instructions requiring PM2/nginx/Hostinger-specific steps

## Exact Implementation Plan
1. Harden repo security and cleanup tracked artifacts.
2. Replace env examples and docs with Vercel-first production guidance.
3. Add a new document subsystem in Prisma for draft/version/approval/signature state.
4. Refactor offer acceptance so it never issues a signable contract immediately.
5. Add admin-only approval and token issuance paths.
6. Replace public signing with version-bound approved-document signing only.
7. Add protected document storage abstraction backed by Supabase Storage.
8. Introduce HTML/CSS-based PDF renderer abstraction for Vercel Node runtime.
9. Add admin document UI for manual and inquiry-derived documents.
10. Clean SEO, metadata, canonical, robots, sitemap, trust content, and legal wording.
