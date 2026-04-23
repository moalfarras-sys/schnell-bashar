# PDF Engine Architecture

## Current Reality
- Legacy production-facing PDFs still use `pdfkit`.
- The newer document subsystem already has an HTML/CSS + Chromium renderer path for sample/document rendering.
- The architecture is therefore transitional, not fully migrated yet.

## Current Practical Split
- `pdfkit`:
  - legacy offer / contract / invoice generation already used in production flows
- HTML/CSS renderer:
  - used by the newer document engine sample/export flow
  - requires Chromium availability outside Vercel local runtime

## Why This Is Acceptable For Now
- it preserves the existing live business workflows
- it avoids breaking production documents while the new document workflow stabilizes
- it keeps the codebase moving toward a stronger Vercel-compatible renderer

## Recommended Final Direction
- HTML/CSS document templates
- print CSS for A4 layout
- server-side Chromium rendering on Node runtime
- `pdf-lib` only for append/merge/stamp tasks

## Storage Strategy
- generated business PDFs must not be stored in `public/`
- document storage should use Supabase-backed protected storage access
- public branding images may remain in `public/media`

## Remaining Work
- complete migration of legacy `pdfkit` document paths into the newer renderer when business risk is acceptable
- generate local sample PDFs only when `PUPPETEER_EXECUTABLE_PATH` is available outside Vercel
