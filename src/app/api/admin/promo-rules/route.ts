import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { hasPermission } from "@/server/auth/admin-permissions";
import { normalizePromoCode } from "@/server/offers/promo-rules";

const createSchema = z.object({
  code: z.string().trim().min(2).max(50),
  moduleId: z.string().min(2).optional().nullable(),
  serviceTypeScope: z.enum(["MOVING", "DISPOSAL", "BOTH"]).optional().nullable(),
  discountType: z.enum(["PERCENT", "FLAT_CENTS"]),
  discountValue: z.number().int().min(1).max(1000000),
  minOrderCents: z.number().int().min(0).max(100000000).default(0),
  maxDiscountCents: z.number().int().min(0).max(100000000).optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  active: z.boolean().default(true),
});

const patchSchema = z.object({
  id: z.string().min(2),
  expectedVersion: z.number().int().min(0).optional(),
  code: z.string().trim().min(2).max(50).optional(),
  moduleId: z.string().min(2).optional().nullable(),
  serviceTypeScope: z.enum(["MOVING", "DISPOSAL", "BOTH"]).optional().nullable(),
  discountType: z.enum(["PERCENT", "FLAT_CENTS"]).optional(),
  discountValue: z.number().int().min(1).max(1000000).optional(),
  minOrderCents: z.number().int().min(0).max(100000000).optional(),
  maxDiscountCents: z.number().int().min(0).max(100000000).optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
});

async function requirePermission(permission: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return null;

  try {
    const claims = await verifyAdminToken(token);
    return hasPermission(claims.roles, claims.permissions, permission) ? claims : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const claims = await requirePermission("promos.read");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const items = await prisma.promoRule.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      module: {
        select: { id: true, slug: true, nameDe: true },
      },
    },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const claims = await requirePermission("promos.update");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const code = normalizePromoCode(data.code);
  const created = await prisma.promoRule.upsert({
    where: { code },
    update: {
      moduleId: data.moduleId ?? null,
      serviceTypeScope: data.serviceTypeScope ?? null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderCents: data.minOrderCents,
      maxDiscountCents: data.maxDiscountCents ?? null,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validTo: data.validTo ? new Date(data.validTo) : null,
      active: data.active,
      deletedAt: data.active ? null : new Date(),
      deletedBy: data.active ? null : claims.uid ?? claims.email,
      version: { increment: 1 },
    },
    create: {
      code,
      moduleId: data.moduleId ?? null,
      serviceTypeScope: data.serviceTypeScope ?? null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderCents: data.minOrderCents,
      maxDiscountCents: data.maxDiscountCents ?? null,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validTo: data.validTo ? new Date(data.validTo) : null,
      active: data.active,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const claims = await requirePermission("promos.update");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;
  const data: Record<string, unknown> = {};
  if (p.code !== undefined) data.code = normalizePromoCode(p.code);
  if (p.moduleId !== undefined) data.moduleId = p.moduleId ?? null;
  if (p.serviceTypeScope !== undefined) data.serviceTypeScope = p.serviceTypeScope ?? null;
  if (p.discountType !== undefined) data.discountType = p.discountType;
  if (p.discountValue !== undefined) data.discountValue = p.discountValue;
  if (p.minOrderCents !== undefined) data.minOrderCents = p.minOrderCents;
  if (p.maxDiscountCents !== undefined) data.maxDiscountCents = p.maxDiscountCents ?? null;
  if (p.validFrom !== undefined) data.validFrom = p.validFrom ? new Date(p.validFrom) : null;
  if (p.validTo !== undefined) data.validTo = p.validTo ? new Date(p.validTo) : null;
  if (p.active !== undefined) {
    data.active = p.active;
    data.deletedAt = p.active ? null : new Date();
    data.deletedBy = p.active ? null : claims.uid ?? claims.email;
  }
  data.version = { increment: 1 };

  if (p.expectedVersion !== undefined) {
    const result = await prisma.promoRule.updateMany({
      where: { id: p.id, version: p.expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) {
      return NextResponse.json(
        { error: "Konflikt: Datensatz wurde zwischenzeitlich geändert. Bitte aktualisieren." },
        { status: 409 },
      );
    }
    const updated = await prisma.promoRule.findUnique({ where: { id: p.id } });
    return NextResponse.json(updated);
  }

  const updated = await prisma.promoRule.update({
    where: { id: p.id },
    data: { ...data, version: { increment: 1 } },
  });
  return NextResponse.json(updated);
}

