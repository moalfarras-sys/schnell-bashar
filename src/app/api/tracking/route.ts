import { NextResponse } from "next/server";
import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";

import { prisma } from "@/server/db/prisma";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Eingegangen",
  CONFIRMED: "Bestätigt",
  IN_PROGRESS: "In Bearbeitung",
  DONE: "Abgeschlossen",
  CANCELLED: "Storniert",
};

const querySchema = z.object({
  orderId: z.string().min(6),
  email: z.string().email(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    orderId: searchParams.get("orderId"),
    email: searchParams.get("email"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Tracking-Daten." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { publicId: parsed.data.orderId.trim() },
    select: {
      publicId: true,
      status: true,
      customerEmail: true,
      customerName: true,
      slotStart: true,
      slotEnd: true,
      createdAt: true,
      serviceType: true,
      speed: true,
      volumeM3: true,
      priceMinCents: true,
      priceMaxCents: true,
      wizardData: true,
    },
  });

  if (!order || order.customerEmail.toLowerCase() !== parsed.data.email.toLowerCase()) {
    return NextResponse.json({ error: "Keine Anfrage mit diesen Daten gefunden." }, { status: 404 });
  }

  const wizardData = order.wizardData as { inquiry?: { fromAddress?: string; toAddress?: string } } | null;
  const fromAddress = wizardData?.inquiry?.fromAddress ?? "";
  const toAddress = wizardData?.inquiry?.toAddress ?? "";

  const priceCents = order.priceMaxCents ?? order.priceMinCents ?? 0;
  const vatCents = Math.round(priceCents * 0.19);
  const grossCents = priceCents + vatCents;

  return NextResponse.json({
    trackingCode: order.publicId,
    orderId: order.publicId,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] ?? order.status,
    customerName: order.customerName,
    serviceType: order.serviceType,
    speed: order.speed,
    date: formatInTimeZone(order.slotStart, "Europe/Berlin", "dd.MM.yyyy"),
    time: `${formatInTimeZone(order.slotStart, "Europe/Berlin", "HH:mm")} - ${formatInTimeZone(order.slotEnd, "Europe/Berlin", "HH:mm")}`,
    fromAddress,
    toAddress,
    volumeM3: order.volumeM3,
    priceNet: priceCents,
    priceGross: grossCents,
    createdAt: formatInTimeZone(order.createdAt, "Europe/Berlin", "dd.MM.yyyy HH:mm"),
    createdAtLabel: formatInTimeZone(order.createdAt, "Europe/Berlin", "dd.MM.yyyy HH:mm"),
    slotLabel: `${formatInTimeZone(order.slotStart, "Europe/Berlin", "dd.MM.yyyy HH:mm")} - ${formatInTimeZone(order.slotEnd, "Europe/Berlin", "HH:mm")}`,
  });
}

