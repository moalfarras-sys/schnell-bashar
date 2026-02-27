import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { requireAdminPermission } from "@/server/auth/require-admin-permission";

const createSchema = z.object({
  nameDe: z.string().trim().min(2).max(120),
  defaultVatRate: z.number().min(0).max(100).optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});

const patchSchema = z.object({
  id: z.string().min(2),
  nameDe: z.string().trim().min(2).max(120).optional(),
  defaultVatRate: z.number().min(0).max(100).optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const claims = await requireAdminPermission("accounting.read");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const items = await prisma.expenseCategory.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { nameDe: "asc" }],
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const claims = await requireAdminPermission("accounting.update");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.expenseCategory.create({
    data: {
      nameDe: parsed.data.nameDe,
      defaultVatRate: parsed.data.defaultVatRate ?? null,
      sortOrder: parsed.data.sortOrder,
      active: parsed.data.active,
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

  const item = await prisma.expenseCategory.update({
    where: { id: parsed.data.id },
    data: {
      nameDe: parsed.data.nameDe,
      defaultVatRate: parsed.data.defaultVatRate,
      sortOrder: parsed.data.sortOrder,
      active: parsed.data.active,
      deletedAt: parsed.data.active === false ? new Date() : parsed.data.active === true ? null : undefined,
      deletedBy:
        parsed.data.active === false
          ? claims.uid ?? claims.email
          : parsed.data.active === true
            ? null
            : undefined,
    },
  });
  return NextResponse.json({ item });
}

