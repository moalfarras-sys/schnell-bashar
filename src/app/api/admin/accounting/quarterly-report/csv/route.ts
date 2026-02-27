import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPermission } from "@/server/auth/require-admin-permission";
import { buildQuarterlyReport } from "@/server/accounting/expenses";

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  quarter: z.coerce.number().int().min(1).max(4),
});

function csvEscape(value: string) {
  if (/[;"\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(req: NextRequest) {
  const claims = await requireAdminPermission("accounting.export");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const parsed = querySchema.safeParse({
    year: req.nextUrl.searchParams.get("year"),
    quarter: req.nextUrl.searchParams.get("quarter"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Parameter", details: parsed.error.flatten() }, { status: 400 });
  }

  const year = parsed.data.year;
  const quarter = parsed.data.quarter as 1 | 2 | 3 | 4;
  const report = await buildQuarterlyReport({ year, quarter });

  const lines = [
    "Bereich;Netto;USt;Brutto",
    `Umsätze bezahlt;${(report.revenue.netCents / 100).toFixed(2)};${(report.revenue.vatCents / 100).toFixed(2)};${(report.revenue.grossCents / 100).toFixed(2)}`,
    `Betriebsausgaben;${(report.expenses.netCents / 100).toFixed(2)};${(report.expenses.vatCents / 100).toFixed(2)};${(report.expenses.grossCents / 100).toFixed(2)}`,
    `USt Zahllast;;;${(report.ust.vatPayableCents / 100).toFixed(2)}`,
    "",
    "Kategorie;Anzahl;Netto;USt;Brutto",
    ...report.byCategory.map((cat) =>
      [
        cat.categoryName,
        String(cat.count),
        (cat.netCents / 100).toFixed(2),
        (cat.vatCents / 100).toFixed(2),
        (cat.grossCents / 100).toFixed(2),
      ]
        .map((part) => csvEscape(part))
        .join(";"),
    ),
  ].join("\n");

  return new NextResponse(lines, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quartalsbericht-${year}-Q${quarter}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

