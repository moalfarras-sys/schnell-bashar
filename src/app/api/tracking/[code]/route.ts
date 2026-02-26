import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";

import { prisma } from "@/server/db/prisma";
import { formatRequestedWindow, preferredTimeWindowLabel } from "@/lib/schedule-format";

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
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!code || code.length < 4) {
    return NextResponse.json({ error: "Ungültiger Tracking-Code." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { publicId: code.trim() },
    select: {
      publicId: true,
      status: true,
      customerEmail: true,
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
    return NextResponse.json(
      { error: "Keine Anfrage mit diesem Code gefunden." },
      { status: 404 },
    );
  }

  const wizardData = order.wizardData as {
    inquiry?: { fromAddress?: string; toAddress?: string };
  } | null;
  const fromAddress = wizardData?.inquiry?.fromAddress ?? "";
  const toAddress = wizardData?.inquiry?.toAddress ?? "";

  const priceCents = order.priceMaxCents ?? order.priceMinCents ?? 0;
  const vatCents = Math.round(priceCents * 0.19);
  const grossCents = priceCents + vatCents;
  const requestedLabel = formatRequestedWindow(
    order.requestedDateFrom,
    order.requestedDateTo,
    order.preferredTimeWindow,
  );
  const hasScheduledSlot = Boolean(order.slotStart && order.slotEnd);
  const dateLabel = hasScheduledSlot
    ? formatInTimeZone(order.slotStart!, "Europe/Berlin", "dd.MM.yyyy")
    : order.requestedDateFrom
      ? formatInTimeZone(order.requestedDateFrom, "Europe/Berlin", "dd.MM.yyyy")
      : "offen";
  const timeLabel = hasScheduledSlot
    ? `${formatInTimeZone(order.slotStart!, "Europe/Berlin", "HH:mm")} - ${formatInTimeZone(order.slotEnd!, "Europe/Berlin", "HH:mm")}`
    : `Angefragt (${preferredTimeWindowLabel(order.preferredTimeWindow)})`;

  return NextResponse.json({
    trackingCode: order.publicId,
    orderId: order.publicId,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] ?? order.status,
    customerName: order.customerName,
    serviceType: order.serviceType,
    speed: order.speed,
    date: dateLabel,
    time: timeLabel,
    requestedWindow: requestedLabel,
    fromAddress,
    toAddress,
    volumeM3: order.volumeM3,
    priceNet: priceCents,
    priceGross: grossCents,
    createdAt: formatInTimeZone(order.createdAt, "Europe/Berlin", "dd.MM.yyyy HH:mm"),
    slotLabel: hasScheduledSlot
      ? `${formatInTimeZone(order.slotStart!, "Europe/Berlin", "dd.MM.yyyy HH:mm")} - ${formatInTimeZone(order.slotEnd!, "Europe/Berlin", "HH:mm")}`
      : requestedLabel || "Termin angefragt",
  });
}
