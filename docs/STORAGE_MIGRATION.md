# Storage Migration

## Current State
- Static website media: `public/media`
- Mixed runtime file handling:
  - Supabase Storage already used for some offers and signed contracts
  - local filesystem still used in some contract/manual flows and uploads

## Target State
- Public static assets:
  - remain in `public/media`
- Private business documents:
  - store in Supabase Storage under private/protected buckets
- Generated PDFs:
  - render in request scope
  - optionally write to `/tmp`
  - upload to storage
  - serve through protected API download endpoints

## Required Buckets
- `documents-private`
- `signed-documents-private`
- `expense-receipts`
- `media-public` only if future public media management needs separation from repo assets

## Rules
- Do not store customer PDFs in `public/`
- Do not rely on persistent local filesystem on Vercel
- Do not expose raw storage keys to public routes
- Admin downloads require admin auth
- Customer downloads require document/signing token checks

## Code Migration Targets
- replace local contract writes in:
  - `src/app/api/admin/contracts/manual/route.ts`
  - `src/app/api/contracts/sign/fallback/route.ts`
- replace any public URL assumptions in contract PDF access routes
- centralize storage reads/writes in `src/lib/documents/storage.ts`
