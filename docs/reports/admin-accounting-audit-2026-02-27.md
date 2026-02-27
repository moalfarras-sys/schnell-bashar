# Admin Accounting Audit – 2026-02-27

## Ziel
Ausgabenverwaltung + Quartalsbericht produktionsreif ergänzen (deutsch, admin-gesichert, exportfähig).

## Umgesetzte Datenmodelle
- `ExpenseCategory`
- `ExpenseEntry`
- `ExpensePaymentMethod`

Dateien:
- `prisma/schema.prisma`
- `prisma/migrations/20260227230000_add_expense_accounting/migration.sql`

## Neue APIs
- `GET/POST/PATCH /api/admin/expense-categories`
- `GET/POST/PATCH /api/admin/expenses`
- `DELETE /api/admin/expenses/[id]` (soft delete)
- `GET /api/admin/expenses/export` (CSV)
- `POST /api/admin/expenses/upload` (Supabase Storage)
- `GET /api/admin/accounting/quarterly-report`
- `GET /api/admin/accounting/quarterly-report/pdf`
- `GET /api/admin/accounting/quarterly-report/csv`

## Neue Admin-UI
- `src/app/admin/accounting/expenses/page.tsx`
- `src/app/admin/accounting/expenses/expenses-client.tsx`
- `src/app/admin/accounting/expense-categories/page.tsx`
- `src/app/admin/accounting/quarterly-report/page.tsx`
- `src/app/admin/accounting/quarterly-report/quarterly-report-client.tsx`

Navigation/Dashboard ergänzt:
- `src/components/admin/admin-nav.tsx`
- `src/app/admin/accounting/page.tsx`

## Ergebnis
- Ausgaben können erfasst, gefiltert, exportiert und mit Beleg-Upload gespeichert werden.
- Quartalsbericht liefert Paid-Umsätze, Ausgaben, USt-Block, Kategorien sowie PDF/CSV-Export.
