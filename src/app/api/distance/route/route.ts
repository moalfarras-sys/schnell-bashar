import { NextResponse } from "next/server";
import { z } from "zod";

import { ORSDistanceError, resolveRouteDistance } from "@/server/distance/ors";
import { prisma } from "@/server/db/prisma";
import {
  calculateDriveChargeCents,
  resolveDistancePricingConfig,
} from "@/server/calc/distance-pricing";

export const runtime = "nodejs";

const pointSchema = z
  .object({
    lat: z.number().optional(),
    lon: z.number().optional(),
    postalCode: z.string().optional(),
    text: z.string().optional(),
  })
  .refine((v) => (Number.isFinite(v.lat) && Number.isFinite(v.lon)) || !!v.text?.trim(), {
    message: "Point requires either lat/lon or text",
  });

const bodySchema = z.object({
  from: pointSchema,
  to: pointSchema,
  profile: z.string().default("driving-car"),
  serviceType: z
    .enum(["MOVING", "BOTH", "DISPOSAL", "UMZUG", "KOMBI", "ENTSORGUNG"])
    .optional(),
});

function shouldApplyDrivePricing(serviceType: string | undefined) {
  return (
    serviceType === "MOVING" ||
    serviceType === "BOTH" ||
    serviceType === "UMZUG" ||
    serviceType === "KOMBI"
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Eingabedaten", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const pricing = await prisma.pricingConfig.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      select: { perKmCents: true },
    });
    const perKmFallback = pricing?.perKmCents ?? 250;
    const distancePricing = resolveDistancePricingConfig(perKmFallback);

    const route = await resolveRouteDistance({
      from: parsed.data.from,
      to: parsed.data.to,
      profile: parsed.data.profile,
    });

    const driveChargeCents = shouldApplyDrivePricing(parsed.data.serviceType)
      ? calculateDriveChargeCents(route.distanceKm, distancePricing)
      : 0;

    return NextResponse.json({
      distanceKm: route.distanceKm,
      source: route.source,
      driveChargeCents,
      perKmCents: distancePricing.perKmCents,
      minDriveCents: distancePricing.minDriveCents,
      fromPostalCode: route.fromPostalCode,
      toPostalCode: route.toPostalCode,
      profile: route.profile,
    });
  } catch (error) {
    console.error("[distance/route] failed:", error);
    if (error instanceof ORSDistanceError && error.code === "ORS_FORBIDDEN") {
      return NextResponse.json(
        {
          error:
            "Die Distanzberechnung ist derzeit nicht verfügbar (ORS-Zugriff abgelehnt). Bitte API-Schlüssel prüfen.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Distanzberechnung fehlgeschlagen" },
      { status: 500 },
    );
  }
}


