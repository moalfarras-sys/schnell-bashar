import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { hasPermission } from "@/server/auth/admin-permissions";

export const runtime = "nodejs";

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function canExportAccounting() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return false;
  try {
    const claims = await verifyAdminToken(token);
    return hasPermission(claims.roles, claims.permissions, "accounting.export");
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await canExportAccounting())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "";
  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

  const andFilters: Record<string, unknown>[] = [];
  if (status && status !== "all") {
    if (status === "overdue") {
      andFilters.push({ OR: [{ status: "UNPAID" }, { status: "PARTIAL" }] });
      andFilters.push({ dueAt: { lt: new Date() } });
    } else {
      andFilters.push({ status: status.toUpperCase() });
    }
  }
  if (search) {
    andFilters.push({
      OR: [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
        { invoiceNo: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  const where: Record<string, unknown> = andFilters.length > 0 ? { AND: andFilters } : {};

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const header = [
    "invoiceNo",
    "status",
    "customerName",
    "customerEmail",
    "grossEur",
    "paidEur",
    "outstandingEur",
    "issuedAt",
    "dueAt",
  ];

  const lines = [
    header.join(","),
    ...invoices.map((i) =>
      [
        i.invoiceNo ?? i.id,
        i.status,
        i.customerName,
        i.customerEmail,
        (i.grossCents / 100).toFixed(2),
        (i.paidCents / 100).toFixed(2),
        ((i.grossCents - i.paidCents) / 100).toFixed(2),
        i.issuedAt.toISOString(),
        i.dueAt.toISOString(),
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];

  const csv = lines.join("\n");
  return new Response("\uFEFF" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=\"invoices-${new Date().toISOString().slice(0, 10)}.csv\"`,
      "cache-control": "no-store",
    },
  });
}
