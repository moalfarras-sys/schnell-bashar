CREATE INDEX IF NOT EXISTS "Invoice_status_issuedAt_deletedAt_idx"
  ON "Invoice" ("status", "issuedAt", "deletedAt");

CREATE INDEX IF NOT EXISTS "ExpenseEntry_date_deletedAt_categoryId_idx"
  ON "ExpenseEntry" ("date", "deletedAt", "categoryId");
