# Asset Cleanup Report

## Scope
- `public/media`
- marketing page image references
- generated slot registry map

## Deleted Assets Intentionally Honored
- `public/media/gallery/1.jpeg`
- `public/media/gallery/2.jpeg`
- `public/media/brand/company-signature.jpeg`
- `public/media/brand/company-signature-clean.png`

## Broken References Fixed
- `ueber-uns` now falls back to:
  - `/media/gallery/team-back.jpeg`
  - `/media/gallery/team-portrait-2.jpeg`
- `galerie` now uses current maintained gallery assets instead of deleted files
- slot resolution now ignores missing local files and falls back cleanly

## Slot / Registry Cleanup
- regenerated `scripts/generated/image-slots-map.json`
- removed stale deleted-file mappings from the generated slot map
- removed explicit legacy signature-slot discovery dependency for deleted public signature files

## Alt Text Improvements
- gallery page alt texts were rewritten in German to be specific and business-appropriate
- `ueber-uns` fallback alt texts were improved in German

## Asset Structure Kept
- `public/media/brand`
- `public/media/gallery`

Reason:
- the structure is already understandable
- moving files again would create unnecessary churn for the live project

## Remaining Review Items
- if the owner wants new branded hero/gallery photography, new assets can be added without changing the current structure
- private document/signature assets must not be reintroduced into `public/media`
