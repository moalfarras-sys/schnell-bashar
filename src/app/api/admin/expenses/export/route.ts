import { NextRequest, NextResponse } from "next/server";

import { listExpenses } from "@/server/accounting/expenses";
import { requireAdminPermission } from "@/server/auth/require-admin-permission";

function csvEscape(value: string) {
  if (/[;"\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(req: NextRequest) {
  const claims = await requireAdminPermission("accounting.export");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const result = await listExpenses({
    month: req.nextUrl.searchParams.get("month") ?? undefined,
    categoryId: req.nextUrl.searchParams.get("categoryId") ?? undefined,
    vatRate: req.nextUrl.searchParams.get("vatRate") ?? undefined,
    vendor: req.nextUrl.searchParams.get("vendor") ?? undefined,
    q: req.nextUrl.searchParams.get("q") ?? undefined,
    page: 1,
    pageSize: 1000,
  });

  const lines = [
    "Datum;Kategorie;Beschreibung;Lieferant;Netto;USt-Satz;USt;Brutto;Zahlungsart;Beleg",
    ...result.rows.map((row) =>
      [
        row.date.toISOString().slice(0, 10),
        row.category.nameDe,
        row.description,
        row.vendor ?? "",
        (row.netCents / 100).toFixed(2),
        row.vatRatePercent.toFixed(2),
        (row.vatCents / 100).toFixed(2),
        (row.grossCents / 100).toFixed(2),
        row.paymentMethod,
        row.receiptFileUrl ?? "",
      ]
        .map((part) => csvEscape(part))
        .join(";"),
    ),
  ].join("\n");

  return new NextResponse(lines, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ausgaben-${req.nextUrl.searchParams.get("month") || "alle"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

