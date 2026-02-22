# Image Slots + Light Theme Notes

## Where tokens live
- Light/Dark glass tokens: `src/styles/glass-tokens.css`
- Global surface/background utility recipes: `src/app/globals.css`
- New recipe classes: `.glass-navbar`, `.glass-panel`, `.glass-pill`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`

## Image slot system
- Prisma models:
  - `MediaAsset`
  - `ContentSlot`
  - `SlotRegistry`
- Core slot resolver:
  - `src/server/content/slots.ts`
- Admin APIs:
  - `POST /api/admin/media/upload`
  - `GET /api/admin/media`
  - `DELETE /api/admin/media/:id`
  - `GET /api/admin/media/slots`
  - `PATCH /api/admin/media/slots`
  - `POST /api/admin/media/slots/sync`

## Admin UI
- Media library page: `src/app/admin/media/page.tsx`
- Slots manager page: `src/app/admin/media/slots/page.tsx`

## Scripts
- Discover hardcoded image usage:
  - `npm run slots:discover`
- Generate placeholders for missing image files:
  - `npm run slots:placeholders`
- Sync registry + content slots:
  - `npm run slots:sync`

Recommended setup order:
1. `npm run slots:discover`
2. `npm run slots:placeholders`
3. `npm run slots:sync`

