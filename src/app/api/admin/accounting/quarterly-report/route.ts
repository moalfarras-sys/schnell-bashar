import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPermission } from "@/server/auth/require-admin-permission";
import { buildQuarterlyReport } from "@/server/accounting/expenses";

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  quarter: z.coerce.number().int().min(1).max(4),
});

export async function GET(req: NextRequest) {
  const claims = await requireAdminPermission("accounting.read");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const parsed = querySchema.safeParse({
    year: req.nextUrl.searchParams.get("year"),
    quarter: req.nextUrl.searchParams.get("quarter"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Parameter", details: parsed.error.flatten() }, { status: 400 });
  }

  const report = await buildQuarterlyReport({
    year: parsed.data.year,
    quarter: parsed.data.quarter as 1 | 2 | 3 | 4,
  });
  return NextResponse.json(report);
}

