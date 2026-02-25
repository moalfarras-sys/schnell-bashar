import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PlusCircle,
  Download,
} from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { InvoiceFilterBar } from "./invoice-filter";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function statusBadge(status: string, dueAt: Date) {
  const now = new Date();
  const isOverdue = (status === "UNPAID" || status === "PARTIAL") && dueAt < now;

  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
        <AlertTriangle className="h-3 w-3" />
        Überfällig
      </span>
    );
  }

  switch (status) {
    case "PAID":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
          <CheckCircle2 className="h-3 w-3" />
          Bezahlt
        </span>
      );
    case "PARTIAL":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
          <Clock className="h-3 w-3" />
          Teilbezahlt
        </span>
      );
    case "UNPAID":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
          <Clock className="h-3 w-3" />
          Unbezahlt
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
          <XCircle className="h-3 w-3" />
          Storniert
        </span>
      );
    default:
      return null;
  }
}

export default async function InvoicesListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string; pageSize?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) redirect("/admin/login");
  try {
    await verifyAdminToken(token);
  } catch {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(10, Number(params.pageSize ?? "20") || 20));

  const andFilters: Record<string, unknown>[] = [];
  if (params.status && params.status !== "all") {
    if (params.status === "overdue") {
      andFilters.push({ OR: [{ status: "UNPAID" }, { status: "PARTIAL" }] });
      andFilters.push({ dueAt: { lt: new Date() } });
    } else {
      andFilters.push({ status: params.status.toUpperCase() });
    }
  }
  if (params.search?.trim()) {
    const query = params.search.trim();
    andFilters.push({
      OR: [
        { customerName: { contains: query, mode: "insensitive" } },
        { customerEmail: { contains: query, mode: "insensitive" } },
        { invoiceNo: { contains: query, mode: "insensitive" } },
      ],
    });
  }
  const where: Record<string, unknown> = andFilters.length > 0 ? { AND: andFilters } : {};

  let dbWarning: string | null = null;
  let invoices: Awaited<ReturnType<typeof prisma.invoice.findMany>> = [];
  let totalCount = 0;
  let unpaidCount = 0;
  let partialCount = 0;
  let paidCount = 0;
  let overdueCount = 0;
  try {
    const [rows, count, unpaid, partial, paid, overdue] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        include: { payments: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.count({ where: { AND: [...andFilters, { status: "UNPAID" }] } }),
      prisma.invoice.count({ where: { AND: [...andFilters, { status: "PARTIAL" }] } }),
      prisma.invoice.count({ where: { AND: [...andFilters, { status: "PAID" }] } }),
      prisma.invoice.count({
        where: {
          AND: [...andFilters, { OR: [{ status: "UNPAID" }, { status: "PARTIAL" }] }, { dueAt: { lt: new Date() } }],
        },
      }),
    ]);
    invoices = rows;
    totalCount = count;
    unpaidCount = unpaid;
    partialCount = partial;
    paidCount = paid;
    overdueCount = overdue;
  } catch (error) {
    console.error("[admin/accounting/invoices] failed to load invoices", error);
    dbWarning =
      "Rechnungen konnten gerade nicht geladen werden. Bitte Datenbankverbindung prüfen.";
  }

  const stats = {
    total: totalCount,
    unpaid: unpaidCount,
    partial: partialCount,
    paid: paidCount,
    overdue: overdueCount,
  };
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));

  const paramsFor = (nextPage: number) => {
    const qs = new URLSearchParams();
    if (params.status && params.status !== "all") qs.set("status", params.status);
    if (params.search?.trim()) qs.set("search", params.search.trim());
    if (params.pageSize && params.pageSize !== "20") qs.set("pageSize", params.pageSize);
    if (nextPage > 1) qs.set("page", String(nextPage));
    return qs.toString();
  };
  const exportQuery = paramsFor(page);

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Rechnungen</h1>
            <p className="mt-2 text-slate-600">Alle Rechnungen verwalten und Zahlungen erfassen</p>
          </div>
          <div className="flex gap-2">
            <a href={`/admin/accounting/invoices/export${exportQuery ? `?${exportQuery}` : ""}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                CSV Export
              </Button>
            </a>
            <Link href="/admin/accounting/invoices/new">
              <Button size="sm" className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Neue Rechnung
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-600">Gesamt</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</div>
          </div>
          <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4 shadow-sm">
            <div className="text-sm font-semibold text-orange-800">Unbezahlt</div>
            <div className="mt-1 text-2xl font-bold text-orange-900">{stats.unpaid}</div>
          </div>
          <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4 shadow-sm">
            <div className="text-sm font-semibold text-yellow-800">Teilbezahlt</div>
            <div className="mt-1 text-2xl font-bold text-yellow-900">{stats.partial}</div>
          </div>
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 shadow-sm">
            <div className="text-sm font-semibold text-green-800">Bezahlt</div>
            <div className="mt-1 text-2xl font-bold text-green-900">{stats.paid}</div>
          </div>
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 shadow-sm">
            <div className="text-sm font-semibold text-red-800">Überfällig</div>
            <div className="mt-1 text-2xl font-bold text-red-900">{stats.overdue}</div>
          </div>
        </div>

        <InvoiceFilterBar />

        {dbWarning ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {dbWarning}
          </div>
        ) : null}

        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="rounded-xl border-2 border-slate-200 bg-white p-12 text-center shadow-sm">
              <Receipt className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Keine Rechnungen gefunden</h3>
              <p className="mt-2 text-sm text-slate-600">Erstellen Sie eine neue Rechnung oder ändern Sie die Filter.</p>
            </div>
          ) : (
            invoices.map((inv) => {
              const outstanding = inv.grossCents - inv.paidCents;
              return (
                <Link
                  key={inv.id}
                  href={`/admin/accounting/invoices/${inv.id}`}
                  className="flex flex-col gap-3 rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{inv.invoiceNo || inv.id.slice(0, 8)}</span>
                      {statusBadge(inv.status, inv.dueAt)}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{inv.customerName}</div>
                    <div className="mt-1 flex gap-4 text-xs text-slate-500">
                      <span>Erstellt: {format(inv.issuedAt, "dd.MM.yyyy", { locale: de })}</span>
                      <span>Fällig: {format(inv.dueAt, "dd.MM.yyyy", { locale: de })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">{formatEuro(inv.grossCents)}</div>
                      {outstanding > 0 && outstanding < inv.grossCents && (
                        <div className="text-xs text-red-600">Offen: {formatEuro(outstanding)}</div>
                      )}
                    </div>
                    <a
                      href={`/api/admin/invoices/${inv.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="outline" size="sm" className="gap-1">
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    </a>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
            <span className="text-slate-600">
              Seite {page} von {totalPages} - {totalCount} Rechnungen
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/accounting/invoices${paramsFor(Math.max(1, page - 1)) ? `?${paramsFor(Math.max(1, page - 1))}` : ""}`}
              >
                <Button variant="outline" size="sm" disabled={page <= 1}>
                  Zurück
                </Button>
              </Link>
              <Link
                href={`/admin/accounting/invoices${paramsFor(Math.min(totalPages, page + 1)) ? `?${paramsFor(Math.min(totalPages, page + 1))}` : ""}`}
              >
                <Button variant="outline" size="sm" disabled={page >= totalPages}>
                  Weiter
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </Container>
    </div>
  );
}
