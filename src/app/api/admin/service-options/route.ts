import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { hasPermission } from "@/server/auth/admin-permissions";

const createSchema = z.object({
  moduleId: z.string().min(2),
  code: z.string().trim().min(2).max(80),
  nameDe: z.string().trim().min(2).max(120),
  descriptionDe: z.string().trim().max(500).optional().nullable(),
  pricingType: z.enum(["FLAT", "PER_UNIT", "PER_M3", "PER_HOUR"]),
  defaultPriceCents: z.number().int().min(0).max(10_000_000),
  defaultLaborMinutes: z.number().int().min(0).max(24 * 60).default(0),
  defaultVolumeM3: z.number().min(0).max(100).default(0),
  requiresQuantity: z.boolean().default(true),
  requiresPhoto: z.boolean().default(false),
  isHeavy: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

const patchSchema = z.object({
  id: z.string().min(2),
  moduleId: z.string().min(2).optional(),
  code: z.string().trim().min(2).max(80).optional(),
  nameDe: z.string().trim().min(2).max(120).optional(),
  descriptionDe: z.string().trim().max(500).optional().nullable(),
  pricingType: z.enum(["FLAT", "PER_UNIT", "PER_M3", "PER_HOUR"]).optional(),
  defaultPriceCents: z.number().int().min(0).max(10_000_000).optional(),
  defaultLaborMinutes: z.number().int().min(0).max(24 * 60).optional(),
  defaultVolumeM3: z.number().min(0).max(100).optional(),
  requiresQuantity: z.boolean().optional(),
  requiresPhoto: z.boolean().optional(),
  isHeavy: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
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

export async function GET(req: NextRequest) {
  const claims = await requirePermission("services.read");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const moduleId = req.nextUrl.searchParams.get("moduleId") ?? undefined;
  const items = await prisma.serviceOption.findMany({
    where: {
      deletedAt: null,
      ...(moduleId ? { moduleId } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { nameDe: "asc" }],
    include: {
      module: {
        select: { id: true, slug: true, nameDe: true },
      },
    },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const claims = await requirePermission("services.update");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const code = data.code.trim().toUpperCase();

  const item = await prisma.serviceOption.upsert({
    where: { code },
    update: {
      moduleId: data.moduleId,
      nameDe: data.nameDe,
      descriptionDe: data.descriptionDe ?? null,
      pricingType: data.pricingType,
      defaultPriceCents: data.defaultPriceCents,
      defaultLaborMinutes: data.defaultLaborMinutes,
      defaultVolumeM3: data.defaultVolumeM3,
      requiresQuantity: data.requiresQuantity,
      requiresPhoto: data.requiresPhoto,
      isHeavy: data.isHeavy,
      sortOrder: data.sortOrder,
      active: true,
      deletedAt: null,
      deletedBy: null,
      version: { increment: 1 },
    },
    create: {
      moduleId: data.moduleId,
      code,
      nameDe: data.nameDe,
      descriptionDe: data.descriptionDe ?? null,
      pricingType: data.pricingType,
      defaultPriceCents: data.defaultPriceCents,
      defaultLaborMinutes: data.defaultLaborMinutes,
      defaultVolumeM3: data.defaultVolumeM3,
      requiresQuantity: data.requiresQuantity,
      requiresPhoto: data.requiresPhoto,
      isHeavy: data.isHeavy,
      sortOrder: data.sortOrder,
      active: true,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const claims = await requirePermission("services.update");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  for (const key of [
    "moduleId",
    "nameDe",
    "descriptionDe",
    "pricingType",
    "defaultPriceCents",
    "defaultLaborMinutes",
    "defaultVolumeM3",
    "requiresQuantity",
    "requiresPhoto",
    "isHeavy",
    "sortOrder",
  ] as const) {
    if (parsed.data[key] !== undefined) data[key] = parsed.data[key] as unknown;
  }
  if (parsed.data.code !== undefined) data.code = parsed.data.code.trim().toUpperCase();
  if (parsed.data.active !== undefined) {
    data.active = parsed.data.active;
    data.deletedAt = parsed.data.active ? null : new Date();
    data.deletedBy = parsed.data.active ? null : claims.uid ?? claims.email;
  }
  data.version = { increment: 1 };

  const item = await prisma.serviceOption.update({
    where: { id: parsed.data.id },
    data,
  });

  return NextResponse.json(item);
}
