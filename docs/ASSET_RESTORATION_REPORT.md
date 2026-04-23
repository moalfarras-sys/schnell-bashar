# Asset Restoration Report

## Summary

This repair pass re-audited recently removed assets and compared them against current live usage. The goal was to restore only assets that are still functionally or visually required.

## Restored Files

- None in this pass.

## Replaced Files

- No direct file restores were necessary for public pages.
- Existing in-repo assets remained the preferred visual sources for:
  - homepage hero
  - `ueber-uns`
  - `galerie`
  - service and city page imagery

## Files Kept Removed Intentionally

- `public/media/gallery/1.jpeg`
- `public/media/gallery/2.jpeg`
- `public/media/brand/company-signature.jpeg`
- `public/media/brand/company-signature-clean.png`

## Why They Stayed Removed

- No active public page depends on `1.jpeg` or `2.jpeg`.
- No broken image references remained after re-checking the codebase.
- Current public imagery is stronger and more coherent without restoring those placeholder-style gallery files.
- Active PDF branding uses stamp/logo assets that are still present. The removed signature files are not required by the currently active runtime document path.

## Pages Reviewed

- `/`
- `/booking`
- `/preise`
- `/faq`
- `/kontakt`
- `/galerie`
- `/ueber-uns`

## Fixed Image References

- No broken public image references were found in this pass.
- Existing slot fallbacks remain valid.

## Final Asset Decision

- Restore from git history only when a removed asset is proven necessary.
- Keep current production visuals where they are stronger and already stable.
