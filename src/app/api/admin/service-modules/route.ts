import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { hasPermission } from "@/server/auth/admin-permissions";

const createSchema = z.object({
  slug: z.enum(["MONTAGE", "ENTSORGUNG"]),
  nameDe: z.string().trim().min(2).max(100),
  descriptionDe: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

const patchSchema = z.object({
  id: z.string().min(2),
  nameDe: z.string().trim().min(2).max(100).optional(),
  descriptionDe: z.string().trim().max(500).optional().nullable(),
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

export async function GET() {
  const claims = await requirePermission("services.read");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const rows = await prisma.serviceModule.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      options: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { nameDe: "asc" }],
      },
      _count: {
        select: { options: true },
      },
    },
  });
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const claims = await requirePermission("services.update");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 400 });
  }

  const row = await prisma.serviceModule.upsert({
    where: { slug: parsed.data.slug },
    update: {
      nameDe: parsed.data.nameDe,
      descriptionDe: parsed.data.descriptionDe ?? null,
      sortOrder: parsed.data.sortOrder,
      active: true,
      deletedAt: null,
      deletedBy: null,
    },
    create: {
      slug: parsed.data.slug,
      nameDe: parsed.data.nameDe,
      descriptionDe: parsed.data.descriptionDe ?? null,
      sortOrder: parsed.data.sortOrder,
      active: true,
    },
  });

  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const claims = await requirePermission("services.update");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.nameDe !== undefined) data.nameDe = parsed.data.nameDe;
  if (parsed.data.descriptionDe !== undefined) data.descriptionDe = parsed.data.descriptionDe ?? null;
  if (parsed.data.sortOrder !== undefined) data.sortOrder = parsed.data.sortOrder;
  if (parsed.data.active !== undefined) {
    data.active = parsed.data.active;
    data.deletedAt = parsed.data.active ? null : new Date();
    data.deletedBy = parsed.data.active ? null : claims.uid ?? claims.email;
  }

  const row = await prisma.serviceModule.update({
    where: { id: parsed.data.id },
    data,
  });
  return NextResponse.json(row);
}

