import { prisma } from "@/server/db/prisma";

type InvoiceQuery = {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type InvoiceListResult = {
  invoices: Awaited<ReturnType<typeof prisma.invoice.findMany>>;
  totalCount: number;
  unpaidCount: number;
  partialCount: number;
  paidCount: number;
  overdueCount: number;
};

function buildFilters(params: InvoiceQuery) {
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
  return andFilters;
}

type InvoiceDb = {
  invoice: {
    findMany: typeof prisma.invoice.findMany;
    count: typeof prisma.invoice.count;
  };
  $transaction: typeof prisma.$transaction;
};

export async function listInvoices(
  query: InvoiceQuery,
  db: InvoiceDb = prisma,
): Promise<InvoiceListResult> {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(query.pageSize ?? 20) || 20));
  const andFilters = buildFilters(query);
  const where: Record<string, unknown> = andFilters.length > 0 ? { AND: andFilters } : {};

  try {
    const [rows, count, unpaid, partial, paid, overdue] = await db.$transaction([
      db.invoice.findMany({
        where,
        include: { payments: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.invoice.count({ where }),
      db.invoice.count({ where: { AND: [...andFilters, { status: "UNPAID" }] } }),
      db.invoice.count({ where: { AND: [...andFilters, { status: "PARTIAL" }] } }),
      db.invoice.count({ where: { AND: [...andFilters, { status: "PAID" }] } }),
      db.invoice.count({
        where: {
          AND: [...andFilters, { OR: [{ status: "UNPAID" }, { status: "PARTIAL" }] }, { dueAt: { lt: new Date() } }],
        },
      }),
    ]);

    return {
      invoices: rows,
      totalCount: count,
      unpaidCount: unpaid,
      partialCount: partial,
      paidCount: paid,
      overdueCount: overdue,
    };
  } catch (error) {
    console.error("[accounting/list-invoices] query failed", {
      status: query.status ?? "all",
      hasSearch: Boolean(query.search?.trim()),
      page,
      pageSize,
      message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}
