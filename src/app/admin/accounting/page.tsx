import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Wallet,
  Receipt,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  PlusCircle,
  Files,
} from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { AccountingCharts } from "./accounting-charts";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default async function AccountingDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) redirect("/admin/login");
  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  let dbWarning: string | null = null;
  let allInvoices: Awaited<ReturnType<typeof prisma.invoice.findMany>> = [];
  try {
    allInvoices = await prisma.invoice.findMany({
      include: { payments: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[admin/accounting] failed to load invoices", error);
    dbWarning =
      "Rechnungsdaten konnten gerade nicht geladen werden. Bitte Datenbankverbindung prüfen.";
  }

  const revenueThisMonth = allInvoices
    .filter((inv) => inv.status === "PAID" && inv.issuedAt >= startOfMonth)
    .reduce((sum, inv) => sum + inv.grossCents, 0);

  const revenueYTD = allInvoices
    .filter((inv) => inv.status === "PAID" && inv.issuedAt >= startOfYear)
    .reduce((sum, inv) => sum + inv.grossCents, 0);

  const outstandingInvoices = allInvoices.filter(
    (inv) => inv.status === "UNPAID" || inv.status === "PARTIAL",
  );
  const outstandingTotal = outstandingInvoices.reduce(
    (sum, inv) => sum + (inv.grossCents - inv.paidCents),
    0,
  );

  const overdueInvoices = allInvoices.filter(
    (inv) =>
      (inv.status === "UNPAID" || inv.status === "PARTIAL") &&
      inv.dueAt < now,
  );
  const overdueTotal = overdueInvoices.reduce(
    (sum, inv) => sum + (inv.grossCents - inv.paidCents),
    0,
  );

  const topUnpaid = outstandingInvoices
    .sort((a, b) => b.grossCents - b.paidCents - (a.grossCents - a.paidCents))
    .slice(0, 5);

  const monthlyData: { month: string; revenue: number; count: number }[] = [];
  const labels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  for (let m = 0; m < 12; m++) {
    const monthStart = new Date(now.getFullYear(), m, 1);
    const monthEnd = new Date(now.getFullYear(), m + 1, 1);
    const monthInvoices = allInvoices.filter(
      (inv) => inv.status === "PAID" && inv.issuedAt >= monthStart && inv.issuedAt < monthEnd,
    );
    monthlyData.push({
      month: labels[m],
      revenue: monthInvoices.reduce((s, i) => s + i.grossCents, 0) / 100,
      count: monthInvoices.length,
    });
  }

  const paidCount = allInvoices.filter((i) => i.status === "PAID").length;
  const unpaidCount = allInvoices.filter(
    (i) => i.status === "UNPAID" || i.status === "PARTIAL",
  ).length;
  const overdueCount = overdueInvoices.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Buchhaltung</h1>
            <p className="mt-2 text-slate-600">Umsatz, Rechnungen und Zahlungen im Überblick</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/accounting/expenses">
              <Button variant="outline" size="sm" className="gap-2">
                <Wallet className="h-4 w-4" />
                Ausgaben
              </Button>
            </Link>
            <Link href="/admin/accounting/quarterly">
              <Button variant="outline" size="sm" className="gap-2">
                <Files className="h-4 w-4" />
                Quartalsbericht
              </Button>
            </Link>
            <Link href="/admin/accounting/invoices/new">
              <Button size="sm" className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Neue Rechnung
              </Button>
            </Link>
            <Link href="/admin/accounting/reports">
              <Button variant="outline" size="sm" className="gap-2">
                Berichte
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {dbWarning ? (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {dbWarning}
          </div>
        ) : null}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={TrendingUp}
            label="Umsatz (Monat)"
            value={formatEuro(revenueThisMonth)}
            color="green"
          />
          <StatCard
            icon={Wallet}
            label="Umsatz (Jahr)"
            value={formatEuro(revenueYTD)}
            color="blue"
          />
          <StatCard
            icon={Receipt}
            label="Offen"
            value={formatEuro(outstandingTotal)}
            sub={`${outstandingInvoices.length} Rechnungen`}
            color="yellow"
          />
          <StatCard
            icon={AlertTriangle}
            label="Überfällig"
            value={formatEuro(overdueTotal)}
            sub={`${overdueInvoices.length} Rechnungen`}
            color="red"
          />
        </div>

        <AccountingCharts
          monthlyData={monthlyData}
          statusData={[
            { name: "Bezahlt", value: paidCount },
            { name: "Offen", value: unpaidCount },
            { name: "Überfällig", value: overdueCount },
          ]}
        />

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Top offene Rechnungen</h2>
            <Link href="/admin/accounting/invoices">
              <Button variant="outline" size="sm" className="gap-1">
                Alle Rechnungen
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {topUnpaid.length === 0 ? (
            <div className="rounded-xl border-2 border-slate-200 bg-white p-8 text-center shadow-sm">
              <Receipt className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">Keine offenen Rechnungen vorhanden.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topUnpaid.map((inv) => {
                const outstanding = inv.grossCents - inv.paidCents;
                const isOverdue = inv.dueAt < now;
                return (
                  <Link
                    key={inv.id}
                    href={`/admin/accounting/invoices/${inv.id}`}
                    className="flex items-center justify-between rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{inv.invoiceNo || inv.id.slice(0, 8)}</span>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                            <AlertTriangle className="h-3 w-3" />
                            Überfällig
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{inv.customerName}</span>
                    </div>
                    <span className={`text-sm font-bold ${isOverdue ? "text-red-600" : "text-slate-900"}`}>
                      {formatEuro(outstanding)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  color: "green" | "blue" | "yellow" | "red";
}) {
  const colors = {
    green: "border-green-200 bg-green-50",
    blue: "border-blue-200 bg-blue-50",
    yellow: "border-yellow-200 bg-yellow-50",
    red: "border-red-200 bg-red-50",
  };
  const iconColors = {
    green: "text-green-600",
    blue: "text-blue-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
  };
  return (
    <div className={`rounded-xl border-2 p-5 shadow-sm ${colors[color]}`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${iconColors[color]}`} />
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
