import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { Container } from "@/components/container";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) redirect("/admin/login");
  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  let dbWarning: string | null = null;
  let allInvoices: Array<any> = [];
  try {
    allInvoices = await prisma.invoice.findMany({
      include: { payments: true, order: true },
      orderBy: { issuedAt: "desc" },
    });
  } catch (error) {
    console.error("[admin/accounting/reports] failed to load invoices", error);
    dbWarning =
      "Berichtsdaten konnten gerade nicht geladen werden. Bitte Datenbankverbindung prüfen.";
  }

  const toNumber = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };
  const toDate = (value: unknown) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  };

  const normalizedInvoices = allInvoices.map((inv) => ({
    ...inv,
    issuedAt: toDate((inv as any).issuedAt),
    dueAt: toDate((inv as any).dueAt),
    grossCents: toNumber((inv as any).grossCents),
    netCents: toNumber((inv as any).netCents),
    vatCents: toNumber((inv as any).vatCents),
    paidCents: toNumber((inv as any).paidCents),
    status: String((inv as any).status ?? "UNPAID"),
  }));

  const now = new Date();
  const year = now.getFullYear();
  const monthNames = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];

  const monthlyReport = monthNames.map((name, m) => {
    const monthStart = new Date(year, m, 1);
    const monthEnd = new Date(year, m + 1, 1);

    const monthInv = normalizedInvoices.filter(
      (i) => i.issuedAt && i.issuedAt >= monthStart && i.issuedAt < monthEnd,
    );

    const totalGross = monthInv.reduce((s, i) => s + i.grossCents, 0);
    const totalNet = monthInv.reduce((s, i) => s + i.netCents, 0);
    const totalVat = monthInv.reduce((s, i) => s + i.vatCents, 0);
    const totalPaid = monthInv.reduce((s, i) => s + i.paidCents, 0);
    const paidInv = monthInv.filter((i) => i.status === "PAID");
    const unpaidInv = monthInv.filter((i) => i.status === "UNPAID" || i.status === "PARTIAL");

    return {
      month: name,
      invoiceCount: monthInv.length,
      totalGross,
      totalNet,
      totalVat,
      totalPaid,
      paidCount: paidInv.length,
      unpaidCount: unpaidInv.length,
      outstanding: totalGross - totalPaid,
    };
  });

  const totals = {
    invoiceCount: normalizedInvoices.length,
    totalGross: normalizedInvoices.reduce((s, i) => s + i.grossCents, 0),
    totalNet: normalizedInvoices.reduce((s, i) => s + i.netCents, 0),
    totalVat: normalizedInvoices.reduce((s, i) => s + i.vatCents, 0),
    totalPaid: normalizedInvoices.reduce((s, i) => s + i.paidCents, 0),
    paidCount: normalizedInvoices.filter((i) => i.status === "PAID").length,
    unpaidCount: normalizedInvoices.filter((i) => i.status === "UNPAID" || i.status === "PARTIAL").length,
    overdueCount: normalizedInvoices.filter(
      (i) => (i.status === "UNPAID" || i.status === "PARTIAL") && i.dueAt && i.dueAt < now,
    ).length,
  };

  const orderServiceTypes = normalizedInvoices.reduce(
    (acc, inv) => {
      const serviceType = (inv.order as any)?.serviceType;
      if (serviceType === "MOVING") acc.moving += inv.grossCents;
      else if (serviceType === "DISPOSAL") acc.disposal += inv.grossCents;
      else if (serviceType === "BOTH") acc.both += inv.grossCents;
      else acc.other += inv.grossCents;
      return acc;
    },
    { moving: 0, disposal: 0, both: 0, other: 0 },
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-8">
        <Link
          href="/admin/accounting"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Buchhaltung
        </Link>

        <h1 className="mb-8 text-3xl font-bold text-slate-900">Berichte — {year}</h1>

        {dbWarning ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {dbWarning}
          </div>
        ) : null}

        <ReportsClient
          year={year}
          monthlyReport={monthlyReport}
          totals={totals}
          serviceBreakdown={orderServiceTypes}
        />
      </Container>
    </div>
  );
}
