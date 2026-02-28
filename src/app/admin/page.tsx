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

function statusLabel(status: "NEW" | "REQUESTED" | "CONFIRMED" | "IN_PROGRESS" | "DONE" | "CANCELLED") {
  return {
    NEW: "Neu",
    REQUESTED: "Angefragt",
    CONFIRMED: "Bestätigt",
    IN_PROGRESS: "In Arbeit",
    DONE: "Abgeschlossen",
    CANCELLED: "Storniert",
  }[status];
}

function serviceLabel(serviceType: "MOVING" | "DISPOSAL" | "BOTH") {
  return {
    MOVING: "Umzug",
    DISPOSAL: "Entsorgung",
    BOTH: "Umzug + Entsorgung",
  }[serviceType];
}

export default async function AdminDashboard() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfToday = new Date(now.toDateString());
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  let dbWarning: string | null = null;
  let totalOrders = 0;
  let openOrders = 0;
  let todayOrders = 0;
  let totalOffers = 0;
  let acceptedOffers = 0;
  let signedContracts = 0;
  let revenueThisMonth = 0;
  let revenuePrevMonth = 0;
  let recentOrders: Array<{
    publicId: string;
    orderNo: string | null;
    customerName: string;
    status: "NEW" | "REQUESTED" | "CONFIRMED" | "IN_PROGRESS" | "DONE" | "CANCELLED";
    serviceType: "MOVING" | "DISPOSAL" | "BOTH";
  }> = [];
  let monthlyRaw: Array<{ createdAt: Date }> = [];

  try {
    const [
      totalOrdersRes,
      openOrdersRes,
      todayOrdersRes,
      totalOffersRes,
      acceptedOffersRes,
      signedContractsRes,
      revenueThisMonthRes,
      revenuePrevMonthRes,
      recentOrdersRes,
      monthlyRawRes,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ["NEW", "REQUESTED"] } } }),
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
          serviceType: true,
        },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    totalOrders = totalOrdersRes;
    openOrders = openOrdersRes;
    todayOrders = todayOrdersRes;
    totalOffers = totalOffersRes;
    acceptedOffers = acceptedOffersRes;
    signedContracts = signedContractsRes;
    revenueThisMonth = revenueThisMonthRes._sum.grossCents ?? 0;
    revenuePrevMonth = revenuePrevMonthRes._sum.grossCents ?? 0;
    recentOrders = recentOrdersRes;
    monthlyRaw = monthlyRawRes;
  } catch (error) {
    console.error("[admin/dashboard] failed to load db data", error);
    dbWarning =
      "Dashboard-Daten konnten gerade nicht geladen werden. Bitte Datenbankverbindung prüfen.";
  }

  const revTrend =
    revenuePrevMonth > 0
      ? Math.round(((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100)
      : revenueThisMonth > 0
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
    NEW: "bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
    REQUESTED: "bg-sky-500/15 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
    CONFIRMED: "bg-amber-500/20 text-amber-800 dark:bg-amber-500/25 dark:text-amber-300",
    IN_PROGRESS: "bg-purple-500/15 text-purple-800 dark:bg-purple-500/25 dark:text-purple-300",
    DONE: "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-300",
    CANCELLED: "bg-red-500/15 text-red-800 dark:bg-red-500/25 dark:text-red-300",
  };

  return (
    <div className="min-w-0 grid gap-6">
      <div className="surface-glass overflow-hidden rounded-3xl border p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold text-brand-800 ring-1 ring-brand-400/35 dark:text-brand-200">
              Zentrale Steuerung
            </div>
            <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">Admin Dashboard</h1>
            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              Überblick über Aufträge, Umsatz und Kundenaktivität.
            </p>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3 text-right text-xs font-semibold text-slate-600 ring-1 ring-slate-300/70 dark:bg-slate-900/50 dark:text-slate-300 dark:ring-slate-700/70">
            <div>Monatserlös</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">{eur(revenueThisMonth)}</div>
          </div>
        </div>
      </div>

      {dbWarning ? (
        <div className="rounded-xl border border-amber-300 bg-amber-100/95 px-4 py-3 text-sm font-semibold text-amber-900">
          {dbWarning}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0">
          <StatCard
            title="Umsatz (Monat)"
            value={eur(revenueThisMonth)}
            hint={revTrend >= 0 ? `+${revTrend}% ggü. Vormonat` : `${revTrend}% ggü. Vormonat`}
            trend={revTrend >= 0 ? "up" : "down"}
            icon={<Receipt className="h-5 w-5" />}
          />
        </div>
        <div className="min-w-0">
          <StatCard title="Neue Anfragen" value={openOrders} hint="Status: REQUESTED/NEW" icon={<Users className="h-5 w-5" />} />
        </div>
        <div className="min-w-0">
          <StatCard title="Heute" value={todayOrders} hint="seit 00:00 Uhr" icon={<FileText className="h-5 w-5" />} />
        </div>
        <div className="min-w-0">
          <StatCard title="Gesamt" value={totalOrders} hint="alle Aufträge" icon={<FileCheck2 className="h-5 w-5" />} />
        </div>
      </div>

      <div className="surface-glass rounded-3xl border p-6 shadow-lg">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">Conversion-Funnel</div>
        <div className="mt-4 hidden gap-3 sm:grid sm:grid-cols-4">
          <FunnelStep label="Anfragen" value={totalOrders} pctLabel="100%" color="bg-blue-500" />
          <FunnelStep label="Angebote" value={totalOffers} pctLabel={pct(totalOffers, totalOrders)} color="bg-amber-500" />
          <FunnelStep label="Angenommen" value={acceptedOffers} pctLabel={pct(acceptedOffers, totalOrders)} color="bg-purple-500" />
          <FunnelStep label="Unterschrieben" value={signedContracts} pctLabel={pct(signedContracts, totalOrders)} color="bg-emerald-500" />
        </div>
        <div className="mt-4 grid gap-3 sm:hidden">
          <FunnelStepMobile label="Anfragen" value={totalOrders} pctLabel="100%" color="bg-blue-500" />
          <FunnelStepMobile label="Angebote" value={totalOffers} pctLabel={pct(totalOffers, totalOrders)} color="bg-amber-500" />
          <FunnelStepMobile label="Angenommen" value={acceptedOffers} pctLabel={pct(acceptedOffers, totalOrders)} color="bg-purple-500" />
          <FunnelStepMobile label="Unterschrieben" value={signedContracts} pctLabel={pct(signedContracts, totalOrders)} color="bg-emerald-500" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-glass rounded-3xl border p-6 shadow-lg">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">Aufträge pro Monat</div>
          <div className="mt-4">
            <MonthlyOrdersChart data={chartData} />
          </div>
        </div>

        <div className="surface-glass rounded-3xl border p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">Neueste Anfragen</div>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:underline">
              Alle anzeigen <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 grid gap-2">
            {recentOrders.length === 0 ? (
              <div className="rounded-xl bg-slate-200/60 p-4 text-center text-sm text-slate-600 dark:bg-slate-700/40 dark:text-slate-400">
                Noch keine Anfragen.
              </div>
            ) : (
              recentOrders.map((o) => (
                <Link
                  key={o.publicId}
                  href={`/admin/orders/${o.publicId}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-slate-300/70 transition-colors hover:bg-white/90 dark:bg-slate-700/30 dark:ring-slate-700/70 dark:hover:bg-slate-700/50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{o.customerName}</div>
                    <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{o.orderNo ?? o.publicId} · {serviceLabel(o.serviceType)}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColors[o.status] ?? "bg-slate-600 text-slate-300"}`}>
                    {statusLabel(o.status)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="surface-glass rounded-3xl border p-6 shadow-lg">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">Schnellzugriff</div>
        <div className="mt-4 flex flex-wrap gap-3">
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
          <Link href="/admin/calendar">
            <Button variant="outline-light">Abholkalender</Button>
          </Link>
          <Link href="/admin/media/slots">
            <Button variant="outline-light">Bild-Slots</Button>
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
    <div className="surface-glass rounded-3xl border p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-600 dark:text-slate-300">{props.title}</div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200/70 text-slate-700 dark:bg-slate-700/60 dark:text-slate-400">
          {props.icon}
        </div>
      </div>
      <div className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{props.value}</div>
      <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
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
      <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{props.value}</div>
      <div className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300">{props.label}</div>
      <div className="mx-auto mt-2 h-1.5 w-full max-w-[80px] overflow-hidden rounded-full bg-slate-300 dark:bg-slate-700">
        <div
          className={`h-full rounded-full ${props.color}`}
          style={{ width: props.pctLabel === "—" ? "0%" : props.pctLabel }}
        />
      </div>
      <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{props.pctLabel}</div>
    </div>
  );
}

function FunnelStepMobile(props: {
  label: string;
  value: number;
  pctLabel: string;
  color: string;
}) {
  const width = props.pctLabel === "—" ? "0%" : props.pctLabel;
  return (
    <div className="rounded-2xl bg-white/65 p-3 ring-1 ring-slate-300/70 dark:bg-slate-900/50 dark:ring-slate-700/70">
      <div className="flex items-baseline justify-between gap-3">
        <div className="truncate text-xs font-bold text-slate-700 dark:text-slate-300">{props.label}</div>
        <div className="text-lg font-extrabold text-slate-900 dark:text-white">{props.value}</div>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-300 dark:bg-slate-700">
        <div className={`h-full rounded-full ${props.color}`} style={{ width }} />
      </div>
      <div className="mt-1 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{props.pctLabel}</div>
    </div>
  );
}
