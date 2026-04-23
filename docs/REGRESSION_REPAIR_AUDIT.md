# Regression Repair Audit

## Summary

This pass is limited to repairing regressions introduced by recent cleanup and polish work. The repository, GitHub branch, Vercel production deployment, and live domain were already aligned at the start of this pass. The remaining work is focused on visible quality regressions and admin/document stability.

## Broken or Degraded Areas

### Public pages

- `ueber-uns`
  - Copy was technically valid but too generic and weaker than the rest of the site.
  - CTA pointed to prices instead of the main online inquiry flow.
- `kontakt`
  - Contact copy mixed general contact with booking flow too loosely.
  - Primary CTA pointed to `/preise` instead of `/booking`.
  - Contact block needed cleaner separation between phone availability and physical location.
- `faq`
  - Several answers felt too thin or informal for a serious service business.
- `galerie`
  - Intro copy was functional but weaker than the intended business tone.
- `booking`
  - Visible debug/fallback labels had already been removed, but the surrounding wording still needed tightening.
  - Price tier labels still surfaced raw internal values such as `STANDARD`.

### Admin / documents

- `GET /api/admin/documents/[id]/download`
  - Returned `500` for the tested live document.
  - Current implementation preferred storage download whenever `pdfStorageKey` existed, even if private storage was not configured or the object could not be fetched.
  - No graceful fallback existed for malformed or partial document snapshots.
- `admin/dokumente/[id]`
  - Document detail page opened correctly, but did not provide a clear operational PDF panel for generate/open actions.
  - Linked inquiry visibility existed, but navigation back to the related order was missing.

## Image / Asset Findings

### Removed files that need review

- `public/media/brand/company-signature.jpeg`
- `public/media/brand/company-signature-clean.png`
- `public/media/gallery/1.jpeg`
- `public/media/gallery/2.jpeg`

### Removed files that can stay removed

- `public/media/gallery/1.jpeg`
- `public/media/gallery/2.jpeg`

Reason:
- Current public pages no longer reference them directly.
- No broken image references remain.
- Existing replacements in `galerie`, `ueber-uns`, and homepage are valid and visually coherent.

### Assets that remain required

- `public/media/brand/company-stamp-clean.png`
- `public/media/brand/company-stamp.jpeg`
- `public/media/brand/hero-logo.jpeg`
- Existing gallery/service images still referenced by public pages and city pages

### PDF branding observations

- Current runtime contract PDF logic depends on stamp assets, not on the removed `company-signature*.{jpeg,png}` files.
- The removed signature files are not required for the currently active document rendering path.

## Exact Repair Plan

1. Repair admin document PDF handling first.
2. Add safe snapshot validation and graceful fallback in document PDF routes.
3. Add explicit PDF actions in the admin document detail view.
4. Tighten weak public copy on `ueber-uns`, `kontakt`, `faq`, and `galerie`.
5. Normalize customer-facing price tier wording in booking.
6. Keep deleted gallery placeholders (`1.jpeg`, `2.jpeg`) removed unless a concrete visual regression appears during verification.
7. Re-run image, lint, type, test, and build checks.
8. Re-test live routes, admin document detail, and blocked signing behavior.
