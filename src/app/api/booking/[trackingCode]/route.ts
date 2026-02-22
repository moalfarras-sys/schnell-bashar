import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";

import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Eingegangen",
  CONFIRMED: "Bestätigt",
  IN_PROGRESS: "In Bearbeitung",
  DONE: "Abgeschlossen",
  CANCELLED: "Storniert",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ trackingCode: string }> },
) {
  const { trackingCode } = await ctx.params;

  if (!trackingCode || trackingCode.length < 8) {
    return NextResponse.json({ error: "Code nicht gefunden." }, { status: 404 });
  }

  const order = await prisma.order.findFirst({
    where: {
      publicId: {
        equals: trackingCode.trim(),
        mode: "insensitive",
      },
    },
    select: {
      publicId: true,
      status: true,
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

  if (!order) {
    return NextResponse.json({ error: "Code nicht gefunden." }, { status: 404 });
  }

  const wizardData = order.wizardData as { inquiry?: { fromAddress?: string; toAddress?: string } } | null;
  const fromAddress = wizardData?.inquiry?.fromAddress ?? "";
  const toAddress = wizardData?.inquiry?.toAddress ?? "";

  const priceCents = order.priceMaxCents ?? order.priceMinCents ?? 0;
  const vatCents = Math.round(priceCents * 0.19);
  const grossCents = priceCents + vatCents;

  return NextResponse.json({
    trackingCode: order.publicId,
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
  });
}
