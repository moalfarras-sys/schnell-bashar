import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      publicId: true,
      createdAt: true,
      serviceType: true,
      speed: true,
      status: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      slotStart: true,
      slotEnd: true,
      volumeM3: true,
      laborHours: true,
      distanceKm: true,
      priceMinCents: true,
      priceMaxCents: true,
    },
  });

  const header = [
    "publicId",
    "createdAt",
    "serviceType",
    "speed",
    "status",
    "customerName",
    "customerPhone",
    "customerEmail",
    "slotStart",
    "slotEnd",
    "volumeM3",
    "laborHours",
    "distanceKm",
    "priceMinCents",
    "priceMaxCents",
  ];

  const lines = [
    header.join(","),
    ...orders.map((o) =>
      [
        o.publicId,
        o.createdAt.toISOString(),
        o.serviceType,
        o.speed,
        o.status,
        o.customerName,
        o.customerPhone,
        o.customerEmail,
        o.slotStart.toISOString(),
        o.slotEnd.toISOString(),
        o.volumeM3,
        o.laborHours,
        o.distanceKm ?? "",
        o.priceMinCents,
        o.priceMaxCents,
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];

  const csv = lines.join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=\"orders-${new Date().toISOString().slice(0, 10)}.csv\"`,
    },
  });
}

