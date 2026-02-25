import { NextResponse } from "next/server";
import { addDays, format } from "date-fns";

import { prisma } from "@/server/db/prisma";

function esc(v: string) {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toUtcStamp(date: Date) {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

function toDateStamp(date: Date) {
  return format(date, "yyyyMMdd");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const publicId = (url.searchParams.get("publicId") || "").trim();
  if (!publicId) {
    return NextResponse.json({ error: "publicId fehlt." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { publicId },
    select: {
      publicId: true,
      customerName: true,
      serviceType: true,
      slotStart: true,
      slotEnd: true,
      requestedDateFrom: true,
      requestedDateTo: true,
      preferredTimeWindow: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  }

  const uid = `${order.publicId}@schnellsicherumzug.de`;
  const now = new Date();
  const summary = `Schnell Sicher Umzug - ${order.serviceType}`;
  const description = order.slotStart && order.slotEnd
    ? `Bestätigter Termin für Auftrag ${order.publicId}`
    : `Angefragter Termin (${order.preferredTimeWindow ?? "FLEXIBLE"}) für Auftrag ${order.publicId}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Schnell Sicher Umzug//Booking Calendar//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toUtcStamp(now)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
  ];

  if (order.slotStart && order.slotEnd) {
    lines.push(`DTSTART:${toUtcStamp(order.slotStart)}`);
    lines.push(`DTEND:${toUtcStamp(order.slotEnd)}`);
  } else {
    const start = order.requestedDateFrom ?? now;
    const end = addDays(order.requestedDateTo ?? start, 1);
    lines.push(`DTSTART;VALUE=DATE:${toDateStamp(start)}`);
    lines.push(`DTEND;VALUE=DATE:${toDateStamp(end)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  const ics = `${lines.join("\r\n")}\r\n`;
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="auftrag-${order.publicId}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
