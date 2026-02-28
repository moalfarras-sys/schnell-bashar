# SEO + QA Audit Report (2026-02-28)

## 1) Executive Summary
- Completed safe SEO hardening for canonical indexing, sitemap quality, schema quality, and cache/compression setup.
- Fixed metadata/encoding issues that impacted German readability and search snippets.
- Added route-level SEO controls for request-tracking pages to protect private tracking URLs from indexing.
- Build, lint, and text-quality gates pass.

## 2) Issues Found (Prioritized)
| Severity | Issue | Root Cause | Status |
|---|---|---|---|
| Critical | Duplicate/weak sitemap entries (/booking?context=..., redirected routes) | Query-based URLs and redirect targets were included in sitemap | Fixed |
| High | Tracking code pages indexable risk | No route-level robots control for /anfrage/[code] | Fixed |
| High | Inconsistent metadata quality in root/home | Legacy wording and encoding artifacts | Fixed |
| Medium | No explicit permanent redirect intent for /tracking | Temporary redirect function used | Fixed |
| Medium | Structured data lacked full graph cohesion | Schema emitted only one entity type | Fixed |
| Medium | Static asset caching/compression incomplete | Missing explicit immutable cache rule and compression flag | Fixed |

## 3) Applied Changes
1. `src/app/sitemap.ts`
- Removed query-param URLs from sitemap.
- Removed `/tracking` from sitemap because it redirects.
- Kept canonical marketing/public URLs only.

2. `src/app/tracking/page.tsx`
- Switched to `permanentRedirect('/anfrage')`.

3. `src/app/layout.tsx`
- Cleaned German metadata phrasing and UTF-8 consistency.

4. `src/app/(marketing)/page.tsx`
- Added page-level metadata (`title`, `description`, canonical `/`).

5. `src/app/(marketing)/anfrage/layout.tsx` (new)
- Added metadata for tracking search entry page.

6. `src/app/(marketing)/anfrage/[code]/layout.tsx` (new)
- Added `robots: noindex, nofollow` for private status pages.

7. `src/components/schema/local-business.tsx`
- Upgraded to `@graph` schema with `Organization`, `WebSite`, and `MovingCompany`.

8. `next.config.ts`
- Enabled compression (`compress: true`).
- Added immutable cache headers for `/_next/static/*`.

## 4) Validation & Test Results
- `npm run lint` => PASS
- `npm run text:scan-mojibake` => PASS
- `npm run text:scan-transliteration` => PASS
- `npm run build` => PASS (with non-blocking DB reachability warnings in local build environment)

## 5) Core Web Vitals/Performance Actions
- Reduced static asset revalidation pressure with immutable cache headers.
- Enabled transport compression.
- Kept image path checks green (broken/forbidden image scanners pass during build).

## 6) Responsive + UX Notes (Current Pass)
- Existing admin 350px+ responsive hardening remains active from previous deployment.
- This pass focused on SEO/technical quality without functional design regressions.

## 7) 30-Day SEO Plan
1. Week 1: Finalize metadata coverage for remaining dynamic/public pages and breadcrumb alignment.
2. Week 2: Expand FAQ schema coverage per service page and add missing internal links.
3. Week 3: Publish 4-6 intent-focused German articles (Berlin + service intent clusters).
4. Week 4: Search Console iteration (indexing, query CTR, title/meta tuning by impressions).

## 8) Rollback Steps
1. `git revert <commit>` for this SEO patch commit.
2. Or restore files from backup folder: `tmp/backup-seo-20260228-042747`.
3. Rebuild + restart process manager.

## 9) Notes
- No credentials or secrets were modified.
- No destructive operation was performed.
