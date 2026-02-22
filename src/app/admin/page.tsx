import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Receipt,
  FileText,
  FileCheck2,
  Users,
} from "lucide-react";

import { prisma } from "@/server/db/prisma";
import { Button } from "@/components/ui/button";
import { MonthlyOrdersChart } from "@/components/admin/monthly-orders-chart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function pct(a: number, b: number) {
  if (b === 0) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

export default async function AdminDashboard() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfToday = new Date(now.toDateString());

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalOrders,
    openOrders,
    todayOrders,
    totalOffers,
    acceptedOffers,
    signedContracts,
    revenueThisMonth,
    revenuePrevMonth,
    recentOrders,
    monthlyRaw,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "NEW" } }),
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.offer.count(),
    prisma.offer.count({ where: { status: "ACCEPTED" } }),
    prisma.contract.count({ where: { status: "SIGNED" } }),
    prisma.offer.aggregate({
      _sum: { grossCents: true },
      where: {
        contract: { status: "SIGNED", signedAt: { gte: startOfMonth } },
      },
    }),
    prisma.offer.aggregate({
      _sum: { grossCents: true },
      where: {
        contract: {
          status: "SIGNED",
          signedAt: { gte: startOfPrevMonth, lt: startOfMonth },
        },
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        publicId: true,
        orderNo: true,
        customerName: true,
        status: true,
        createdAt: true,
        serviceType: true,
      },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const revThisMonth = revenueThisMonth._sum.grossCents ?? 0;
  const revPrevMonth = revenuePrevMonth._sum.grossCents ?? 0;
  const revTrend =
    revPrevMonth > 0
      ? Math.round(((revThisMonth - revPrevMonth) / revPrevMonth) * 100)
      : revThisMonth > 0
        ? 100
        : 0;

  const monthLabels = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const monthBuckets: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    monthBuckets[key] = 0;
  }
  for (const o of monthlyRaw) {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (key in monthBuckets) monthBuckets[key]++;
  }
  const chartData = Object.entries(monthBuckets).map(([key, count]) => ({
    label: monthLabels[parseInt(key.split("-")[1])],
    count,
  }));

  const statusColors: Record<string, string> = {
    NEW: "bg-blue-500/20 text-blue-400",
    CONFIRMED: "bg-amber-500/20 text-amber-400",
    IN_PROGRESS: "bg-purple-500/20 text-purple-400",
    DONE: "bg-emerald-500/20 text-emerald-400",
    CANCELLED: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="text-xl font-extrabold text-white">Dashboard</div>
        <div className="mt-1 text-sm font-semibold text-slate-300">
          Überblick über Aufträge, Umsatz und Kundenaktivität.
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Umsatz (Monat)"
          value={eur(revThisMonth)}
          hint={
            revTrend >= 0
              ? `+${revTrend}% ggü. Vormonat`
              : `${revTrend}% ggü. Vormonat`
          }
          trend={revTrend >= 0 ? "up" : "down"}
          icon={<Receipt className="h-5 w-5" />}
        />
        <StatCard
          title="Neue Anfragen"
          value={openOrders}
          hint="Status: NEW"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Heute"
          value={todayOrders}
          hint="seit 00:00 Uhr"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Gesamt"
          value={totalOrders}
          hint="alle Aufträge"
          icon={<FileCheck2 className="h-5 w-5" />}
        />
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="text-sm font-extrabold text-white">Conversion-Funnel</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <FunnelStep
            label="Anfragen"
            value={totalOrders}
            pctLabel="100%"
            color="bg-blue-500"
          />
          <FunnelStep
            label="Angebote"
            value={totalOffers}
            pctLabel={pct(totalOffers, totalOrders)}
            color="bg-amber-500"
          />
          <FunnelStep
            label="Angenommen"
            value={acceptedOffers}
            pctLabel={pct(acceptedOffers, totalOrders)}
            color="bg-purple-500"
          />
          <FunnelStep
            label="Unterschrieben"
            value={signedContracts}
            pctLabel={pct(signedContracts, totalOrders)}
            color="bg-emerald-500"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Chart */}
        <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
          <div className="text-sm font-extrabold text-white">Aufträge pro Monat</div>
          <div className="mt-4">
            <MonthlyOrdersChart data={chartData} />
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold text-white">Neueste Anfragen</div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:underline"
            >
              Alle anzeigen <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 grid gap-2">
            {recentOrders.length === 0 ? (
              <div className="rounded-xl bg-slate-700/40 p-4 text-center text-sm text-slate-400">
                Noch keine Anfragen.
              </div>
            ) : (
              recentOrders.map((o) => (
                <Link
                  key={o.publicId}
                  href={`/admin/orders/${o.publicId}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-700/30 px-4 py-3 transition-colors hover:bg-slate-700/50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">
                      {o.customerName}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {o.orderNo ?? o.publicId} · {o.serviceType}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColors[o.status] ?? "bg-slate-600 text-slate-300"}`}
                  >
                    {o.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="text-sm font-extrabold text-white">Schnellzugriff</div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href="/admin/orders">
            <Button>Aufträge öffnen</Button>
          </Link>
          <Link href="/admin/offers">
            <Button variant="outline-light">Angebote & Verträge</Button>
          </Link>
          <Link href="/admin/pricing">
            <Button variant="outline-light">Preise bearbeiten</Button>
          </Link>
          <Link href="/admin/availability">
            <Button variant="outline-light">Zeitfenster</Button>
          </Link>
          <Link href="/admin/media/slots">
            <Button variant="outline-light">Image Slots</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard(props: {
  title: string;
  value: string | number;
  hint: string;
  trend?: "up" | "down";
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-300">{props.title}</div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-700/60 text-slate-400">
          {props.icon}
        </div>
      </div>
      <div className="mt-3 text-2xl font-extrabold text-white">{props.value}</div>
      <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-400">
        {props.trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
        {props.trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
        {props.hint}
      </div>
    </div>
  );
}

function FunnelStep(props: {
  label: string;
  value: number;
  pctLabel: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <div className="text-2xl font-extrabold text-white">{props.value}</div>
      <div className="mt-1 text-xs font-bold text-slate-300">{props.label}</div>
      <div className="mx-auto mt-2 h-1.5 w-full max-w-[80px] overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full ${props.color}`}
          style={{ width: props.pctLabel === "—" ? "0%" : props.pctLabel }}
        />
      </div>
      <div className="mt-1 text-xs font-semibold text-slate-400">{props.pctLabel}</div>
    </div>
  );
}
