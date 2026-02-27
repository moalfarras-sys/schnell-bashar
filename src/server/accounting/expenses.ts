import { prisma } from "@/server/db/prisma";

export type ExpenseFilters = {
  month?: string;
  categoryId?: string;
  vatRate?: string;
  vendor?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export function toCentsFromEuro(input: number) {
  return Math.round(input * 100);
}

export function computeVatAndGross(netCents: number, vatRatePercent: number) {
  const normalizedRate = Number.isFinite(vatRatePercent) ? Math.max(0, vatRatePercent) : 0;
  const vatCents = Math.round(netCents * (normalizedRate / 100));
  return {
    vatCents,
    grossCents: netCents + vatCents,
  };
}

export function resolveMonthRange(month?: string) {
  if (!month) return null;
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthNum = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) return null;
  const start = new Date(Date.UTC(year, monthNum - 1, 1));
  const end = new Date(Date.UTC(year, monthNum, 1));
  return { start, end };
}

export async function listExpenses(filters: ExpenseFilters) {
  const page = Math.max(1, Number(filters.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(filters.pageSize ?? 20) || 20));
  const and: Record<string, unknown>[] = [{ deletedAt: null }];
  const monthRange = resolveMonthRange(filters.month);
  if (monthRange) and.push({ date: { gte: monthRange.start, lt: monthRange.end } });
  if (filters.categoryId?.trim()) and.push({ categoryId: filters.categoryId.trim() });
  if (filters.vatRate?.trim()) and.push({ vatRatePercent: Number(filters.vatRate) });
  if (filters.vendor?.trim()) and.push({ vendor: { contains: filters.vendor.trim(), mode: "insensitive" } });
  if (filters.q?.trim()) {
    const query = filters.q.trim();
    and.push({
      OR: [
        { description: { contains: query, mode: "insensitive" } },
        { vendor: { contains: query, mode: "insensitive" } },
        { notes: { contains: query, mode: "insensitive" } },
      ],
    });
  }
  const where = { AND: and };

  const [rows, totalCount] = await prisma.$transaction([
    prisma.expenseEntry.findMany({
      where,
      include: {
        category: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expenseEntry.count({ where }),
  ]);

  const summary = rows.reduce(
    (acc, row) => {
      acc.netCents += row.netCents;
      acc.vatCents += row.vatCents;
      acc.grossCents += row.grossCents;
      return acc;
    },
    { netCents: 0, vatCents: 0, grossCents: 0 },
  );

  return {
    rows,
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    summary,
  };
}

export function quarterRange(year: number, quarter: 1 | 2 | 3 | 4) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 1));
  return { start, end };
}

export async function buildQuarterlyReport(input: { year: number; quarter: 1 | 2 | 3 | 4 }) {
  const { start, end } = quarterRange(input.year, input.quarter);
  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        issuedAt: { gte: start, lt: end },
        status: "PAID",
        deletedAt: null,
      },
      select: {
        id: true,
        invoiceNo: true,
        issuedAt: true,
        netCents: true,
        vatCents: true,
        grossCents: true,
        paidCents: true,
      },
    }),
    prisma.expenseEntry.findMany({
      where: {
        date: { gte: start, lt: end },
        deletedAt: null,
      },
      include: { category: { select: { id: true, nameDe: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const revenue = invoices.reduce(
    (acc, row) => {
      acc.netCents += row.netCents;
      acc.vatCents += row.vatCents;
      acc.grossCents += row.grossCents;
      acc.paidCents += row.paidCents;
      return acc;
    },
    { netCents: 0, vatCents: 0, grossCents: 0, paidCents: 0 },
  );

  const expensesTotals = expenses.reduce(
    (acc, row) => {
      acc.netCents += row.netCents;
      acc.vatCents += row.vatCents;
      acc.grossCents += row.grossCents;
      return acc;
    },
    { netCents: 0, vatCents: 0, grossCents: 0 },
  );

  const byCategoryMap = new Map<
    string,
    { categoryId: string; categoryName: string; netCents: number; vatCents: number; grossCents: number; count: number }
  >();
  for (const row of expenses) {
    const key = row.categoryId;
    const existing = byCategoryMap.get(key) ?? {
      categoryId: row.categoryId,
      categoryName: row.category.nameDe,
      netCents: 0,
      vatCents: 0,
      grossCents: 0,
      count: 0,
    };
    existing.netCents += row.netCents;
    existing.vatCents += row.vatCents;
    existing.grossCents += row.grossCents;
    existing.count += 1;
    byCategoryMap.set(key, existing);
  }

  const byCategory = [...byCategoryMap.values()].sort((a, b) => b.grossCents - a.grossCents);
  const warnings: string[] = [];
  if (expenses.some((entry) => entry.vatRatePercent === 0)) {
    warnings.push("Mindestens ein Ausgabeneintrag hat 0 % USt. Bitte prüfen Sie die USt-Sätze.");
  }

  const ust = {
    outputVatCents: revenue.vatCents,
    inputVatCents: expensesTotals.vatCents,
    vatPayableCents: revenue.vatCents - expensesTotals.vatCents,
  };

  return {
    period: { start, end },
    revenue,
    expenses: expensesTotals,
    ust,
    profitBeforeTaxCents: revenue.netCents - expensesTotals.netCents,
    invoices,
    expenseEntries: expenses,
    byCategory,
    warnings,
    dataSourceNote:
      "Umsätze basieren auf bezahlten Rechnungen (Status PAID) im Zeitraum. Ausgaben basieren auf manuellen Einträgen in der Ausgabenverwaltung.",
  };
}

