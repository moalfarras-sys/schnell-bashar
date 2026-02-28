import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { requireAdminPermission } from "@/server/auth/require-admin-permission";
import { computeVatAndGross, ensureDefaultExpenseCategories, listExpenses, toCentsFromEuro } from "@/server/accounting/expenses";

const expenseBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vendor: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().min(2).max(500),
  categoryId: z.string().min(2),
  netEuro: z.number().min(0).optional(),
  grossEuro: z.number().min(0).optional(),
  vatRatePercent: z.number().min(0).max(100),
  paymentMethod: z.enum(["CASH", "BANK", "CARD", "OTHER"]).default("BANK"),
  receiptFileUrl: z.string().trim().url().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const createSchema = expenseBodySchema.refine((v) => v.netEuro != null || v.grossEuro != null, {
  message: "Netto oder Brutto ist erforderlich.",
  path: ["netEuro"],
});

const patchSchema = expenseBodySchema.partial().extend({
  id: z.string().min(2),
});

function resolveNetEuro(input: { netEuro?: number; grossEuro?: number; vatRatePercent: number }) {
  if (input.netEuro != null) return input.netEuro;
  if (input.grossEuro != null) {
    const factor = 1 + Math.max(0, input.vatRatePercent) / 100;
    return factor > 0 ? input.grossEuro / factor : input.grossEuro;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const claims = await requireAdminPermission("accounting.read");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const result = await listExpenses({
    month: req.nextUrl.searchParams.get("month") ?? undefined,
    categoryId: req.nextUrl.searchParams.get("categoryId") ?? undefined,
    vatRate: req.nextUrl.searchParams.get("vatRate") ?? undefined,
    vendor: req.nextUrl.searchParams.get("vendor") ?? undefined,
    q: req.nextUrl.searchParams.get("q") ?? undefined,
    page: Number(req.nextUrl.searchParams.get("page") ?? "1"),
    pageSize: Number(req.nextUrl.searchParams.get("pageSize") ?? "20"),
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const claims = await requireAdminPermission("accounting.update");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  await ensureDefaultExpenseCategories();

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 400 });
  }

  const resolvedNetEuro = resolveNetEuro(parsed.data);
  if (resolvedNetEuro == null || !Number.isFinite(resolvedNetEuro) || resolvedNetEuro < 0) {
    return NextResponse.json({ error: "Ungültige Beträge." }, { status: 400 });
  }

  const netCents = toCentsFromEuro(resolvedNetEuro);
  const { vatCents, grossCents } = computeVatAndGross(netCents, parsed.data.vatRatePercent);

  const item = await prisma.expenseEntry.create({
    data: {
      date: new Date(`${parsed.data.date}T00:00:00.000Z`),
      vendor: parsed.data.vendor ?? null,
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      netCents,
      vatRatePercent: parsed.data.vatRatePercent,
      vatCents,
      grossCents,
      paymentMethod: parsed.data.paymentMethod,
      receiptFileUrl: parsed.data.receiptFileUrl ?? null,
      notes: parsed.data.notes ?? null,
      createdByUserId: claims.uid ?? null,
    },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const claims = await requireAdminPermission("accounting.update");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.expenseEntry.findUnique({ where: { id: parsed.data.id } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: "Ausgabe nicht gefunden." }, { status: 404 });
  }

  const nextVatRate =
    parsed.data.vatRatePercent != null ? parsed.data.vatRatePercent : existing.vatRatePercent;
  const resolvedNetEuro = resolveNetEuro({
    netEuro: parsed.data.netEuro,
    grossEuro: parsed.data.grossEuro,
    vatRatePercent: nextVatRate,
  });
  const nextNetCents = resolvedNetEuro != null ? toCentsFromEuro(resolvedNetEuro) : existing.netCents;
  const nextTax = computeVatAndGross(nextNetCents, nextVatRate);

  const item = await prisma.expenseEntry.update({
    where: { id: parsed.data.id },
    data: {
      date: parsed.data.date ? new Date(`${parsed.data.date}T00:00:00.000Z`) : undefined,
      vendor: parsed.data.vendor ?? undefined,
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      netCents: nextNetCents,
      vatRatePercent: nextVatRate,
      vatCents: nextTax.vatCents,
      grossCents: nextTax.grossCents,
      paymentMethod: parsed.data.paymentMethod,
      receiptFileUrl: parsed.data.receiptFileUrl ?? undefined,
      notes: parsed.data.notes ?? undefined,
      version: { increment: 1 },
      deletedAt: null,
      deletedBy: null,
      createdByUserId: existing.createdByUserId ?? claims.uid ?? null,
    },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ item });
}
