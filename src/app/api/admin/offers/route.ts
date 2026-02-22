import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { nextDocumentNumber } from "@/server/ids/document-number";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    await verifyAdminToken(token);
  } catch {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await req.json();

  const {
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    description,
    netCents,
    vatCents,
    grossCents,
    discountPercent,
    discountCents,
    discountNote,
    customNote,
    validDays = 7,
    services,
  } = body;

  if (!customerName || !customerEmail || !customerPhone) {
    return NextResponse.json(
      { error: "Name, E-Mail und Telefon sind Pflichtfelder" },
      { status: 400 },
    );
  }

  const offerToken = nanoid(32);
  const offerNo = await nextDocumentNumber("OFFER");

  const now = new Date();
  const validUntil = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);

  const offer = await prisma.offer.create({
    data: {
      token: offerToken,
      offerNo,
      orderId: null,
      isManual: true,
      status: "PENDING",
      customerName,
      customerEmail,
      customerPhone,
      customerAddress: customerAddress || null,
      notes: description || null,
      services: services || [],
      netCents: Number(netCents) || 0,
      vatCents: Number(vatCents) || 0,
      grossCents: Number(grossCents) || 0,
      discountPercent: discountPercent != null ? Number(discountPercent) : null,
      discountCents: discountCents != null ? Number(discountCents) : null,
      discountNote: discountNote || null,
      customNote: customNote || null,
      validUntil,
      expiresAt: validUntil,
    },
  });

  return NextResponse.json(offer, { status: 201 });
}
