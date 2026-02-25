import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { prisma } from "@/server/db/prisma";
import { wizardPayloadSchema, type WizardPayload } from "@/lib/wizard-schema";
import { estimateOrder } from "@/server/calc/estimate";
import { ORSDistanceError, resolveRouteDistance } from "@/server/distance/ors";
import { resolveDistancePricingConfig } from "@/server/calc/distance-pricing";
import {
  normalizePromoCode,
  resolvePromoRule,
} from "@/server/offers/promo-rules";
import { getAvailableSlots } from "@/server/availability/slots";
import { sendOrderEmail } from "@/server/email/send-order-email";
import { sendCustomerConfirmationEmail } from "@/server/email/send-customer-confirmation";
import { signPdfAccessToken } from "@/server/auth/admin-session";
import { isHoneypotTriggered, isRateLimited, requestIp } from "@/lib/spam-protection";
import { nextDocumentNumber } from "@/server/ids/document-number";

export const runtime = "nodejs";

const formSchema = z.object({
  payload: z.string().min(2),
});

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

function bookingContextLabel(context: WizardPayload["bookingContext"]) {
  if (context === "MONTAGE") return "Montage";
  if (context === "ENTSORGUNG") return "Entsorgung";
  return "Standard";
}

function ceilToGrid(minutes: number, grid: number) {
  return Math.ceil(minutes / grid) * grid;
}

function leadDaysForSpeed(speed: "ECONOMY" | "STANDARD" | "EXPRESS", pricing: any) {
  switch (speed) {
    case "ECONOMY":
      return pricing.economyLeadDays as number;
    case "EXPRESS":
      return pricing.expressLeadDays as number;
    default:
      return pricing.standardLeadDays as number;
  }
}

export async function POST(req: Request) {
  const formData = await req.formData();

  if (isHoneypotTriggered(formData.get("website"))) {
    return NextResponse.json({ error: "Spam erkannt." }, { status: 400 });
  }

  const ip = requestIp(req);
  if (isRateLimited(`orders:${ip}`, 3, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte versuchen Sie es in wenigen Minuten erneut." },
      { status: 429 },
    );
  }

  const raw = formSchema.safeParse({ payload: formData.get("payload") });
  if (!raw.success) {
    return NextResponse.json({ error: "Ungültige Formulardaten" }, { status: 400 });
  }

  let payloadJson: unknown;
  try {
    payloadJson = JSON.parse(raw.data.payload);
  } catch {
    return NextResponse.json({ error: "Ungültige Anfragedaten" }, { status: 400 });
  }

  const parsed = wizardPayloadSchema.safeParse(payloadJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabedaten", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload: WizardPayload = parsed.data;

  // Normalize required addresses based on service type
  if (payload.serviceType === "MOVING") {
    if (!payload.startAddress || !payload.destinationAddress) {
      return NextResponse.json(
        { error: "Start- und Zieladresse sind erforderlich." },
        { status: 400 },
      );
    }
  }

  if (payload.serviceType === "DISPOSAL") {
    if (!payload.pickupAddress || !payload.disposal?.forbiddenConfirmed) {
      return NextResponse.json(
        { error: "Abholadresse und Bestätigung der Ausschlüsse sind erforderlich." },
        { status: 400 },
      );
    }
  }

  if (payload.serviceType === "BOTH") {
    if (!payload.startAddress || !payload.destinationAddress) {
      return NextResponse.json(
        { error: "Start- und Zieladresse sind erforderlich." },
        { status: 400 },
      );
    }
    // If user didn’t set a separate pickup address, reuse the start address.
    if (!payload.pickupAddress && payload.startAddress) payload.pickupAddress = payload.startAddress;
    if (!payload.accessPickup && payload.accessStart) payload.accessPickup = payload.accessStart;
    if (!payload.disposal?.forbiddenConfirmed) {
      return NextResponse.json(
        { error: "Bestätigung der Ausschlüsse für Entsorgung ist erforderlich." },
        { status: 400 },
      );
    }
  }

  const [pricing, catalog, serviceOptionsData, promoRulesData] = await Promise.all([
    prisma.pricingConfig.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.catalogItem.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameDe: "asc" }],
      select: {
        id: true,
        nameDe: true,
        categoryKey: true,
        defaultVolumeM3: true,
        laborMinutesPerUnit: true,
        isHeavy: true,
      },
    }),
    prisma.serviceOption.findMany({
      where: { active: true, deletedAt: null },
      include: {
        module: {
          select: { slug: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { nameDe: "asc" }],
    }),
    prisma.promoRule.findMany({
      where: { active: true, deletedAt: null },
      include: {
        module: {
          select: { slug: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!pricing) {
    return NextResponse.json({ error: "Keine Preiskonfiguration gefunden" }, { status: 500 });
  }

  let routeDistance:
    | {
        distanceKm: number;
        source: "cache" | "ors";
      }
    | undefined;

  if (
    (payload.serviceType === "MOVING" || payload.serviceType === "BOTH") &&
    payload.startAddress &&
    payload.destinationAddress
  ) {
    try {
      routeDistance = await resolveRouteDistance({
        from: {
          lat: payload.startAddress.lat,
          lon: payload.startAddress.lon,
          postalCode: payload.startAddress.postalCode,
        },
        to: {
          lat: payload.destinationAddress.lat,
          lon: payload.destinationAddress.lon,
          postalCode: payload.destinationAddress.postalCode,
        },
        profile: "driving-car",
      });
    } catch (error) {
      console.error("[orders] distance lookup failed:", error);
      const message =
        error instanceof ORSDistanceError && error.code === "ORS_FORBIDDEN"
          ? "Die Distanzberechnung ist derzeit nicht verfügbar (ORS-Zugriff abgelehnt). Bitte kontaktieren Sie uns kurz."
          : "Die Distanz konnte nicht berechnet werden. Bitte prüfen Sie die Adressen.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const distancePricing = resolveDistancePricingConfig(pricing.perKmCents);

  const bookingModuleSlug =
    payload.bookingContext === "MONTAGE"
      ? "MONTAGE"
      : payload.bookingContext === "ENTSORGUNG"
        ? "ENTSORGUNG"
        : null;

  const allowedServiceCodes = new Set(
    serviceOptionsData
      .filter((option) => !bookingModuleSlug || option.module.slug === bookingModuleSlug)
      .map((option) => option.code),
  );
  const normalizedSelectedServiceOptions = (payload.selectedServiceOptions ?? [])
    .filter((item) => allowedServiceCodes.has(item.code))
    .map((item) => ({
      code: item.code,
      qty: Math.max(1, Math.min(50, item.qty || 1)),
      meta: item.meta ?? undefined,
    }));

  const normalizedOfferCode = normalizePromoCode(payload.offerContext?.offerCode);
  const normalizedPayload: WizardPayload = {
    ...payload,
    selectedServiceOptions: normalizedSelectedServiceOptions,
    offerContext: normalizedOfferCode
      ? {
          offerCode: normalizedOfferCode,
        }
      : undefined,
  };

  const serviceOptions = serviceOptionsData.map((option) => ({
    code: option.code,
    moduleSlug: option.module.slug,
    pricingType: option.pricingType,
    defaultPriceCents: option.defaultPriceCents,
    defaultLaborMinutes: option.defaultLaborMinutes,
    isHeavy: option.isHeavy,
    requiresQuantity: option.requiresQuantity,
  }));

  const baseEstimate = estimateOrder(normalizedPayload, {
    catalog,
    pricing: {
      currency: pricing.currency,
      movingBaseFeeCents: pricing.movingBaseFeeCents,
      disposalBaseFeeCents: pricing.disposalBaseFeeCents,
      hourlyRateCents: pricing.hourlyRateCents,
      perM3MovingCents: pricing.perM3MovingCents,
      perM3DisposalCents: pricing.perM3DisposalCents,
      perKmCents: pricing.perKmCents,
      heavyItemSurchargeCents: pricing.heavyItemSurchargeCents,
      stairsSurchargePerFloorCents: pricing.stairsSurchargePerFloorCents,
      carryDistanceSurchargePer25mCents: pricing.carryDistanceSurchargePer25mCents,
      parkingSurchargeMediumCents: pricing.parkingSurchargeMediumCents,
      parkingSurchargeHardCents: pricing.parkingSurchargeHardCents,
      elevatorDiscountSmallCents: pricing.elevatorDiscountSmallCents,
      elevatorDiscountLargeCents: pricing.elevatorDiscountLargeCents,
      uncertaintyPercent: pricing.uncertaintyPercent,
      economyMultiplier: pricing.economyMultiplier,
      standardMultiplier: pricing.standardMultiplier,
      expressMultiplier: pricing.expressMultiplier,
      montageBaseFeeCents: pricing.montageBaseFeeCents,
      entsorgungBaseFeeCents: pricing.entsorgungBaseFeeCents,
      montageStandardMultiplier: pricing.montageStandardMultiplier,
      montagePlusMultiplier: pricing.montagePlusMultiplier,
      montagePremiumMultiplier: pricing.montagePremiumMultiplier,
      entsorgungStandardMultiplier: pricing.entsorgungStandardMultiplier,
      entsorgungPlusMultiplier: pricing.entsorgungPlusMultiplier,
      entsorgungPremiumMultiplier: pricing.entsorgungPremiumMultiplier,
      montageMinimumOrderCents: pricing.montageMinimumOrderCents,
      entsorgungMinimumOrderCents: pricing.entsorgungMinimumOrderCents,
    },
    serviceOptions,
  }, {
    distanceKm: routeDistance?.distanceKm,
    distanceSource: routeDistance?.source,
    distancePricing,
  });

  const promoRule = resolvePromoRule(
    promoRulesData.map((rule) => ({
      id: rule.id,
      code: rule.code,
      moduleSlug: rule.module?.slug ?? null,
      serviceTypeScope: rule.serviceTypeScope,
      discountType: rule.discountType,
      discountValue: rule.discountValue,
      minOrderCents: rule.minOrderCents,
      maxDiscountCents: rule.maxDiscountCents,
      validFrom: rule.validFrom,
      validTo: rule.validTo,
      active: rule.active,
    })),
    {
      code: normalizedOfferCode,
      bookingContext: normalizedPayload.bookingContext,
      serviceType: normalizedPayload.serviceType,
      totalCents: baseEstimate.breakdown.totalCents,
    },
  );

  const estimate = estimateOrder(
    normalizedPayload,
    {
      catalog,
      pricing: {
        currency: pricing.currency,
        movingBaseFeeCents: pricing.movingBaseFeeCents,
        disposalBaseFeeCents: pricing.disposalBaseFeeCents,
        hourlyRateCents: pricing.hourlyRateCents,
        perM3MovingCents: pricing.perM3MovingCents,
        perM3DisposalCents: pricing.perM3DisposalCents,
        perKmCents: pricing.perKmCents,
        heavyItemSurchargeCents: pricing.heavyItemSurchargeCents,
        stairsSurchargePerFloorCents: pricing.stairsSurchargePerFloorCents,
        carryDistanceSurchargePer25mCents: pricing.carryDistanceSurchargePer25mCents,
        parkingSurchargeMediumCents: pricing.parkingSurchargeMediumCents,
        parkingSurchargeHardCents: pricing.parkingSurchargeHardCents,
        elevatorDiscountSmallCents: pricing.elevatorDiscountSmallCents,
        elevatorDiscountLargeCents: pricing.elevatorDiscountLargeCents,
        uncertaintyPercent: pricing.uncertaintyPercent,
        economyMultiplier: pricing.economyMultiplier,
        standardMultiplier: pricing.standardMultiplier,
        expressMultiplier: pricing.expressMultiplier,
        montageBaseFeeCents: pricing.montageBaseFeeCents,
        entsorgungBaseFeeCents: pricing.entsorgungBaseFeeCents,
        montageStandardMultiplier: pricing.montageStandardMultiplier,
        montagePlusMultiplier: pricing.montagePlusMultiplier,
        montagePremiumMultiplier: pricing.montagePremiumMultiplier,
        entsorgungStandardMultiplier: pricing.entsorgungStandardMultiplier,
        entsorgungPlusMultiplier: pricing.entsorgungPlusMultiplier,
        entsorgungPremiumMultiplier: pricing.entsorgungPremiumMultiplier,
        montageMinimumOrderCents: pricing.montageMinimumOrderCents,
        entsorgungMinimumOrderCents: pricing.entsorgungMinimumOrderCents,
      },
      serviceOptions,
    },
    {
      distanceKm: routeDistance?.distanceKm,
      distanceSource: routeDistance?.source,
      distancePricing,
      promoRule: promoRule
        ? {
            id: promoRule.id,
            code: promoRule.code,
            moduleSlug: promoRule.moduleSlug,
            serviceTypeScope: promoRule.serviceTypeScope,
            discountType: promoRule.discountType,
            discountValue: promoRule.discountValue,
            minOrderCents: promoRule.minOrderCents,
            maxDiscountCents: promoRule.maxDiscountCents,
          }
        : null,
    },
  );

  const slotStart = new Date(payload.timing.selectedSlotStart);
  if (Number.isNaN(slotStart.getTime())) {
    return NextResponse.json({ error: "Ungültiger Terminbeginn" }, { status: 400 });
  }

  // Lead time check (Europe/Berlin)
  const leadDays = leadDaysForSpeed(payload.timing.speed, pricing);
  const todayISO = formatInTimeZone(new Date(), "Europe/Berlin", "yyyy-MM-dd");
  const earliestISO = format(addDays(parseISO(todayISO), Math.max(0, leadDays)), "yyyy-MM-dd");
  const slotDayISO = formatInTimeZone(slotStart, "Europe/Berlin", "yyyy-MM-dd");
  if (slotDayISO < earliestISO) {
    return NextResponse.json(
      { error: "Der gewählte Termin ist zu früh für die gewählte Priorität." },
      { status: 400 },
    );
  }

  const baseDuration = Math.ceil(estimate.laborHours * 60 + 30);
  const durationMinutes = ceilToGrid(
    Math.max(payload.timing.jobDurationMinutes, baseDuration),
    60,
  );

  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

  // Validate slot availability at submit time
  const dayISO = slotDayISO;

  const day = parseISO(dayISO);
  const dayStart = fromZonedTime(
    new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0),
    "Europe/Berlin",
  );
  const dayEnd = fromZonedTime(
    new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999),
    "Europe/Berlin",
  );

  const rules = await prisma.availabilityRule.findMany({ where: { active: true } });
  const exceptions = await prisma.availabilityException.findMany({
    where: { date: new Date(dayISO) },
  });
  const existing = await prisma.order.findMany({
    where: {
      slotStart: { lt: dayEnd },
      slotEnd: { gt: dayStart },
      status: { not: "CANCELLED" },
    },
    select: { slotStart: true, slotEnd: true },
  });

  const allowed = getAvailableSlots({
    fromISO: dayISO,
    toISO: dayISO,
    durationMinutes,
    rules: rules.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      slotMinutes: r.slotMinutes,
      capacity: r.capacity,
      active: r.active,
    })),
    exceptions: exceptions.map((e) => ({
      date: dayISO,
      closed: e.closed,
      overrideCapacity: e.overrideCapacity,
    })),
    existingBookings: existing.map((b) => ({ start: b.slotStart, end: b.slotEnd })),
    maxResults: 500,
  });

  const isAllowed = allowed.some((s) => s.start.toISOString() === slotStart.toISOString());
  if (!isAllowed) {
    return NextResponse.json(
      { error: "Der gewählte Termin ist nicht mehr verfügbar. Bitte wählen Sie neu." },
      { status: 409 },
    );
  }

  // Uploads (optional)
  const files = formData.getAll("photos").filter((x) => x instanceof File) as File[];
  if (files.length > 10) {
    return NextResponse.json({ error: "Maximal 10 Fotos." }, { status: 400 });
  }

  const orderNo = await nextDocumentNumber("ORDER");
  const publicId = orderNo;

  const uploadDir =
    process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim().length > 0
      ? process.env.UPLOAD_DIR
      : path.join(process.cwd(), "public", "uploads");

  const orderFolder = path.join(uploadDir, publicId);
  await fs.mkdir(orderFolder, { recursive: true });

  const savedUploads: { fileName: string; filePath: string; mimeType: string; sizeBytes: number }[] =
    [];

  for (const f of files) {
    if (f.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Datei zu groß (max. 8MB pro Foto)." }, { status: 400 });
    }
    const ext = path.extname(f.name).slice(0, 10) || ".jpg";
    const safeName = `${crypto.randomUUID()}${ext}`;
    const buf = Buffer.from(await f.arrayBuffer());
    const absPath = path.join(orderFolder, safeName);
    await fs.writeFile(absPath, buf);

    // Store path as relative URL if uploads are inside public/
    const rel =
      uploadDir.endsWith(path.join("public", "uploads")) || uploadDir.includes(`${path.sep}public${path.sep}uploads`)
        ? `/uploads/${publicId}/${safeName}`
        : absPath;

    savedUploads.push({
      fileName: f.name,
      filePath: rel,
      mimeType: f.type || "application/octet-stream",
      sizeBytes: f.size,
    });
  }

  const moveLineCreates = Object.entries(payload.itemsMove ?? {})
    .filter(([, qty]) => qty && qty > 0)
    .map(([catalogItemId, qty]) => {
      const item = catalog.find((c) => c.id === catalogItemId);
      const unit = item?.defaultVolumeM3 ?? 0;
      return {
        catalogItemId,
        qty,
        unitVolumeM3: unit,
        lineVolumeM3: unit * qty,
        isDisposal: false,
      };
    });

  const disposalLineCreates = Object.entries(payload.itemsDisposal ?? {})
    .filter(([, qty]) => qty && qty > 0)
    .map(([catalogItemId, qty]) => {
      const item = catalog.find((c) => c.id === catalogItemId);
      const unit = item?.defaultVolumeM3 ?? 0;
      return {
        catalogItemId,
        qty,
        unitVolumeM3: unit,
        lineVolumeM3: unit * qty,
        isDisposal: true,
      };
    });

  const itemRowsForEmail = [...moveLineCreates, ...disposalLineCreates].map((row) => ({
    name: catalog.find((c) => c.id === row.catalogItemId)?.nameDe ?? row.catalogItemId,
    qty: row.qty,
    isDisposal: row.isDisposal,
    lineVolumeM3: row.lineVolumeM3,
  }));

  const persistedPayload: WizardPayload = {
    ...normalizedPayload,
    offerContext: normalizedOfferCode
      ? {
          offerCode: normalizedOfferCode,
          ruleId: promoRule?.id,
          appliedDiscountPercent:
            promoRule?.discountType === "PERCENT" ? promoRule.discountValue : undefined,
          appliedDiscountCents:
            promoRule?.discountType === "FLAT_CENTS" ? promoRule.discountValue : undefined,
          validUntil:
            promoRule?.validTo != null ? new Date(promoRule.validTo).toISOString() : undefined,
        }
      : undefined,
  };

  const orderDataBase = {
    publicId,
    serviceType: payload.serviceType,
    speed: payload.timing.speed,
    customerName: payload.customer.name,
    customerPhone: payload.customer.phone,
    customerEmail: payload.customer.email,
    contactPreference: payload.customer.contactPreference,
    note: payload.customer.note || null,
    slotStart,
    slotEnd,
    volumeM3: estimate.totalVolumeM3,
    laborHours: estimate.laborHours,
    distanceKm: estimate.distanceKm ?? null,
    priceMinCents: estimate.priceMinCents,
    priceMaxCents: estimate.priceMaxCents,
    wizardData: {
      ...persistedPayload,
      pricingBreakdownV2: estimate.breakdown,
    } as any,
    lines: {
      create: [...moveLineCreates, ...disposalLineCreates],
    },
    uploads: savedUploads.length
      ? {
          create: savedUploads.map((u) => ({
            fileName: u.fileName,
            filePath: u.filePath,
            mimeType: u.mimeType,
            sizeBytes: u.sizeBytes,
          })),
        }
      : undefined,
  };

  const order = await prisma.order.create({
    data: {
      ...orderDataBase,
      orderNo,
    },
    select: { publicId: true },
  });

  // Email to company (best effort)
  try {
    await sendOrderEmail({
      publicId: order.publicId,
      payload,
      estimate,
      slotStart,
      slotEnd,
      uploadNames: savedUploads.map((u) => u.fileName),
      itemRows: itemRowsForEmail,
    });
  } catch (e) {
    console.error("Company email send failed", e);
  }

  // Confirmation email to customer (best effort)
  try {
    await sendCustomerConfirmationEmail({
      publicId: order.publicId,
      customerEmail: payload.customer.email,
      customerName: payload.customer.name,
      serviceType: payload.serviceType,
      speed: payload.timing.speed,
      slotStart,
      slotEnd,
      priceMinCents: estimate.priceMinCents,
      priceMaxCents: estimate.priceMaxCents,
      totalVolumeM3: estimate.totalVolumeM3,
      itemRows: itemRowsForEmail,
    });
  } catch (e) {
    console.error("Customer confirmation email send failed", e);
  }

  const waText = encodeURIComponent(
    `Hallo! Ich habe eine Anfrage ueber die Website gesendet (${bookingContextLabel(payload.bookingContext)}). Auftrags-ID: ${order.publicId}.`,
  );
  const waUrl = `https://wa.me/491729573681?text=${waText}`;

  const pdfToken = await signPdfAccessToken(order.publicId);

  return NextResponse.json({
    ok: true,
    publicId: order.publicId,
    pdfToken,
    price: `${eur(estimate.priceMinCents)} – ${eur(estimate.priceMaxCents)}`,
    whatsappUrl: waUrl,
  });
}

