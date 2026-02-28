import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPermission } from "@/server/auth/require-admin-permission";
import { buildQuarterlyReport } from "@/server/accounting/expenses";
import { generateQuarterlyReportPdf } from "@/server/pdf/generate-quarterly-report";

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  quarter: z.coerce.number().int().min(1).max(4),
});

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
  const pdfBuffer = await generateQuarterlyReportPdf({
    year,
    quarter,
    periodStart: report.period.start,
    periodEnd: new Date(report.period.end.getTime() - 24 * 60 * 60 * 1000),
    revenue: report.revenue,
    expenses: report.expenses,
    ust: report.ust,
    profitBeforeTaxCents: report.profitBeforeTaxCents,
    byCategory: report.byCategory,
    warnings: report.warnings,
    dataSourceNote: report.dataSourceNote,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="quartalsbericht-${year}-Q${quarter}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
