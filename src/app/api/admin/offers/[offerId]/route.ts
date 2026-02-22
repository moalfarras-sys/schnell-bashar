import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ offerId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    await verifyAdminToken(token);
  } catch {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { offerId } = await params;

  const existing = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!existing) {
    return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });
  }

  const body = await req.json();

  const data: Record<string, unknown> = {};

  if (body.netCents !== undefined) data.netCents = Number(body.netCents);
  if (body.vatCents !== undefined) data.vatCents = Number(body.vatCents);
  if (body.grossCents !== undefined) data.grossCents = Number(body.grossCents);
  if (body.discountPercent !== undefined)
    data.discountPercent = body.discountPercent !== null ? Number(body.discountPercent) : null;
  if (body.discountCents !== undefined)
    data.discountCents = body.discountCents !== null ? Number(body.discountCents) : null;
  if (body.discountNote !== undefined) data.discountNote = body.discountNote || null;
  if (body.customNote !== undefined) data.customNote = body.customNote || null;
  if (body.customerName !== undefined) data.customerName = body.customerName;
  if (body.customerEmail !== undefined) data.customerEmail = body.customerEmail;
  if (body.customerPhone !== undefined) data.customerPhone = body.customerPhone;
  if (body.customerAddress !== undefined) data.customerAddress = body.customerAddress || null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.validUntil !== undefined) data.validUntil = new Date(body.validUntil);

  const updated = await prisma.offer.update({
    where: { id: offerId },
    data,
  });

  return NextResponse.json(updated);
}
