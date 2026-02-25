import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";

import { prisma } from "@/server/db/prisma";
import { formatRequestedWindow, preferredTimeWindowLabel } from "@/lib/schedule-format";

export const runtime = "nodejs";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Eingegangen",
  REQUESTED: "Termin angefragt",
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
      requestedDateFrom: true,
      requestedDateTo: true,
      preferredTimeWindow: true,
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

  const requestedWindow = formatRequestedWindow(
    order.requestedDateFrom,
    order.requestedDateTo,
    order.preferredTimeWindow,
  );
  const hasScheduledSlot = Boolean(order.slotStart && order.slotEnd);
  const date = hasScheduledSlot
    ? formatInTimeZone(order.slotStart!, "Europe/Berlin", "dd.MM.yyyy")
    : order.requestedDateFrom
      ? formatInTimeZone(order.requestedDateFrom, "Europe/Berlin", "dd.MM.yyyy")
      : "offen";
  const time = hasScheduledSlot
    ? `${formatInTimeZone(order.slotStart!, "Europe/Berlin", "HH:mm")} - ${formatInTimeZone(order.slotEnd!, "Europe/Berlin", "HH:mm")}`
    : `Angefragt (${preferredTimeWindowLabel(order.preferredTimeWindow)})`;

  return NextResponse.json({
    trackingCode: order.publicId,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] ?? order.status,
    customerName: order.customerName,
    serviceType: order.serviceType,
    speed: order.speed,
    date,
    time,
    requestedWindow,
    fromAddress,
    toAddress,
    volumeM3: order.volumeM3,
    priceNet: priceCents,
    priceGross: grossCents,
    createdAt: formatInTimeZone(order.createdAt, "Europe/Berlin", "dd.MM.yyyy HH:mm"),
  });
}
