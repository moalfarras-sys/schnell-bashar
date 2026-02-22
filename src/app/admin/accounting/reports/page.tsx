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

  const allInvoices = await prisma.invoice.findMany({
    include: { payments: true, order: true },
    orderBy: { issuedAt: "desc" },
  });

  const now = new Date();
  const year = now.getFullYear();
  const monthNames = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];

  const monthlyReport = monthNames.map((name, m) => {
    const monthStart = new Date(year, m, 1);
    const monthEnd = new Date(year, m + 1, 1);

    const monthInv = allInvoices.filter(
      (i) => i.issuedAt >= monthStart && i.issuedAt < monthEnd,
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
    invoiceCount: allInvoices.length,
    totalGross: allInvoices.reduce((s, i) => s + i.grossCents, 0),
    totalNet: allInvoices.reduce((s, i) => s + i.netCents, 0),
    totalVat: allInvoices.reduce((s, i) => s + i.vatCents, 0),
    totalPaid: allInvoices.reduce((s, i) => s + i.paidCents, 0),
    paidCount: allInvoices.filter((i) => i.status === "PAID").length,
    unpaidCount: allInvoices.filter((i) => i.status === "UNPAID" || i.status === "PARTIAL").length,
    overdueCount: allInvoices.filter(
      (i) => (i.status === "UNPAID" || i.status === "PARTIAL") && i.dueAt < now,
    ).length,
  };

  const orderServiceTypes = allInvoices.reduce(
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
