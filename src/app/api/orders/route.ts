import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { Prisma } from "../../../../prisma/generated/prisma/client";

import { prisma } from "@/server/db/prisma";
import { wizardPayloadSchema, type WizardPayload } from "@/lib/wizard-schema";
import { estimateOrder } from "@/server/calc/estimate";
import { resolveRouteDistance } from "@/server/distance/ors";
import { resolveDistancePricingConfig } from "@/server/calc/distance-pricing";
import {
  normalizePromoCode,
  resolvePromoRule,
} from "@/server/offers/promo-rules";
import { sendOrderEmail } from "@/server/email/send-order-email";
import { sendCustomerConfirmationEmail } from "@/server/email/send-customer-confirmation";
import { sendOfferEmail } from "@/server/email/send-offer-email";
import { signPdfAccessToken } from "@/server/auth/admin-session";
import { isHoneypotTriggered, isRateLimited, requestIp } from "@/lib/spam-protection";
import { generateOfferPDF } from "@/server/pdf/generate-offer";
import { generateAGBPDF } from "@/server/pdf/generate-agb";
import { STORAGE_BUCKETS, getSupabaseAdmin } from "@/lib/supabase";
import { deriveOfferNoFromOrderNo, nextDocumentNumber } from "@/server/ids/document-number";
import { loadOperationalSettings } from "@/server/settings/operational-settings";

export const runtime = "nodejs";
const OFFER_VALIDITY_DAYS = parseInt(process.env.OFFER_VALIDITY_DAYS || "7", 10);

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
  if (context === "SPECIAL") return "Spezialservice";
  return "Standard";
}

function toOfferServiceType(serviceType: WizardPayload["serviceType"]) {
  if (serviceType === "DISPOSAL") return "ENTSORGUNG";
  if (serviceType === "BOTH") return "KOMBI";
  return "UMZUG";
}

type CartKind = WizardPayload["serviceCart"][number]["kind"];

const cartKindLabel: Record<CartKind, string> = {
  UMZUG: "Umzug",
  MONTAGE: "Montage",
  ENTSORGUNG: "Entsorgung",
  SPECIAL: "Spezialservice",
};

function normalizeServiceCart(payload: WizardPayload): WizardPayload["serviceCart"] {
  const fromPayload = (payload.serviceCart ?? []).filter(Boolean);
  if (fromPayload.length > 0) {
    const dedupe = new Map<string, WizardPayload["serviceCart"][number]>();
    for (const item of fromPayload) {
      const key = `${item.kind}:${item.moduleSlug ?? "-"}`;
      if (!dedupe.has(key)) dedupe.set(key, item);
    }
    return [...dedupe.values()];
  }

  const inferred: WizardPayload["serviceCart"] = [];
  if (payload.serviceType === "MOVING" || payload.serviceType === "BOTH") {
    inferred.push({ kind: "UMZUG", qty: 1, titleDe: cartKindLabel.UMZUG });
  }
  if (payload.serviceType === "DISPOSAL" || payload.serviceType === "BOTH") {
    inferred.push({
      kind: "ENTSORGUNG",
      moduleSlug: "ENTSORGUNG",
      qty: 1,
      titleDe: cartKindLabel.ENTSORGUNG,
    });
  }
  if (payload.bookingContext === "MONTAGE") {
    inferred.push({
      kind: "MONTAGE",
      moduleSlug: "MONTAGE",
      qty: 1,
      titleDe: cartKindLabel.MONTAGE,
    });
  }
  if (payload.bookingContext === "SPECIAL") {
    inferred.push({
      kind: "SPECIAL",
      moduleSlug: "SPECIAL",
      qty: 1,
      titleDe: cartKindLabel.SPECIAL,
    });
  }

  if (inferred.length === 0) {
    inferred.push({ kind: "UMZUG", qty: 1, titleDe: cartKindLabel.UMZUG });
  }

  return inferred;
}

function deriveLegacyShapeFromCart(
  cart: WizardPayload["serviceCart"],
): Pick<WizardPayload, "serviceType" | "bookingContext"> {
  const hasMoving = cart.some((item) => item.kind === "UMZUG");
  const hasDisposal = cart.some((item) => item.kind === "ENTSORGUNG");
  const hasMontage = cart.some((item) => item.kind === "MONTAGE");
  const hasSpecial = cart.some((item) => item.kind === "SPECIAL");

  const serviceType: WizardPayload["serviceType"] = hasMoving && hasDisposal
    ? "BOTH"
    : hasDisposal
      ? "DISPOSAL"
      : "MOVING";

  let bookingContext: WizardPayload["bookingContext"] = "STANDARD";
  if (!hasMoving && !hasDisposal && hasSpecial) bookingContext = "SPECIAL";
  else if (!hasMoving && !hasDisposal && hasMontage) bookingContext = "MONTAGE";
  else if (!hasMoving && hasDisposal && !hasMontage && !hasSpecial) bookingContext = "ENTSORGUNG";

  return { serviceType, bookingContext };
}

function propsModuleIdForSlug(
  slug: "MONTAGE" | "ENTSORGUNG" | "SPECIAL",
  options: Array<{ moduleId: string; module: { slug: "MONTAGE" | "ENTSORGUNG" | "SPECIAL" } }>,
) {
  return options.find((option) => option.module.slug === slug)?.moduleId ?? null;
}

const addonLabels: Record<WizardPayload["addons"][number], string> = {
  PACKING: "Packservice",
  DISMANTLE_ASSEMBLE: "Möbel Demontage/Montage",
  OLD_KITCHEN_DISPOSAL: "Küchenentsorgung",
  BASEMENT_ATTIC_CLEARING: "Keller-/Dachbodenräumung",
};

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

  const parsedPayload: WizardPayload = parsed.data;
  const serviceCart = normalizeServiceCart(parsedPayload);
  const legacyShape = deriveLegacyShapeFromCart(serviceCart);
  const payload: WizardPayload = {
    ...parsedPayload,
    payloadVersion: 2,
    serviceCart,
    serviceType: legacyShape.serviceType,
    bookingContext: legacyShape.bookingContext,
  };

  // Normalize required addresses based on service type
  if (payload.serviceType === "MOVING") {
    if (payload.bookingContext === "MONTAGE" || payload.bookingContext === "SPECIAL") {
      if (!payload.pickupAddress) {
        return NextResponse.json(
          { error: "Einsatzadresse ist für Montage erforderlich." },
          { status: 400 },
        );
      }
      if (!payload.accessPickup && payload.accessStart) {
        payload.accessPickup = payload.accessStart;
      }
    } else if (!payload.startAddress || !payload.destinationAddress) {
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

  const [pricing, catalog, serviceOptionsData, promoRulesData, operationalSettings] = await Promise.all([
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
    loadOperationalSettings(),
  ]);

  if (!pricing) {
    return NextResponse.json({ error: "Keine Preiskonfiguration gefunden" }, { status: 500 });
  }

  let routeDistance:
      | {
        distanceKm: number;
        source: "cache" | "ors" | "fallback";
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
          text: payload.startAddress.displayName,
        },
        to: {
          lat: payload.destinationAddress.lat,
          lon: payload.destinationAddress.lon,
          postalCode: payload.destinationAddress.postalCode,
          text: payload.destinationAddress.displayName,
        },
        profile: "driving-car",
      });
    } catch (error) {
      console.error("[orders] distance lookup failed; continuing without route distance", {
        error: error instanceof Error ? error.message : String(error),
        from: payload.startAddress.displayName,
        to: payload.destinationAddress.displayName,
      });
      routeDistance = undefined;
    }
  }

  const distancePricing = resolveDistancePricingConfig(pricing.perKmCents);

  const bookingModuleSlug =
    payload.bookingContext === "MONTAGE"
      ? "MONTAGE"
      : payload.bookingContext === "ENTSORGUNG"
        ? "ENTSORGUNG"
        : payload.bookingContext === "SPECIAL"
          ? "SPECIAL"
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

  const requestedDateFrom = new Date(payload.timing.requestedFrom);
  const requestedDateTo = new Date(payload.timing.requestedTo);
  if (
    Number.isNaN(requestedDateFrom.getTime()) ||
    Number.isNaN(requestedDateTo.getTime())
  ) {
    return NextResponse.json({ error: "Ungültiger Wunschtermin." }, { status: 400 });
  }
  if (requestedDateTo.getTime() < requestedDateFrom.getTime()) {
    return NextResponse.json(
      { error: "Das Enddatum muss am oder nach dem Startdatum liegen." },
      { status: 400 },
    );
  }

  // Lead-time check (Europe/Berlin) for the requested start date.
  const leadDays = leadDaysForSpeed(payload.timing.speed, pricing);
  const todayISO = formatInTimeZone(new Date(), "Europe/Berlin", "yyyy-MM-dd");
  const earliestISO = format(addDays(parseISO(todayISO), Math.max(0, leadDays)), "yyyy-MM-dd");
  const requestedFromISO = formatInTimeZone(requestedDateFrom, "Europe/Berlin", "yyyy-MM-dd");
  if (requestedFromISO < earliestISO) {
    return NextResponse.json(
      { error: "Der gewünschte Zeitraum beginnt zu früh für die gewählte Priorität." },
      { status: 400 },
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

  const serviceOptionByCode = new Map(serviceOptionsData.map((option) => [option.code, option]));

  const orderServiceItemCreates: Prisma.OrderServiceItemCreateWithoutOrderInput[] = [
    ...payload.serviceCart.map((item, index) => ({
      kind: item.kind,
      moduleId:
        item.moduleSlug != null
          ? (propsModuleIdForSlug(item.moduleSlug, serviceOptionsData) ?? null)
          : null,
      serviceOptionCode: null as string | null,
      titleDe: item.titleDe?.trim() || cartKindLabel[item.kind],
      detailsJson: item.details
        ? (item.details as Prisma.InputJsonValue)
        : undefined,
      qty: Math.max(1, Math.min(50, item.qty || 1)),
      unit: "Leistung",
      unitPriceCents: 0,
      lineTotalCents: 0,
      sortOrder: index,
    })),
    ...normalizedSelectedServiceOptions.map((item, index) => {
      const option = serviceOptionByCode.get(item.code);
      const qty = Math.max(1, Math.min(50, item.qty || 1));
      const unitPriceCents = option?.defaultPriceCents ?? 0;
      const lineTotalCents = unitPriceCents * qty;
      const kind: CartKind =
        option?.module.slug === "MONTAGE"
          ? "MONTAGE"
          : option?.module.slug === "ENTSORGUNG"
            ? "ENTSORGUNG"
            : option?.module.slug === "SPECIAL"
              ? "SPECIAL"
              : "UMZUG";
      return {
        kind,
        moduleId: option?.moduleId ?? null,
        serviceOptionCode: item.code,
        titleDe: option?.nameDe || item.code,
        detailsJson: item.meta
          ? (item.meta as Prisma.InputJsonValue)
          : undefined,
        qty,
        unit: option?.requiresQuantity ? "Stück" : "Pauschale",
        unitPriceCents,
        lineTotalCents,
        sortOrder: payload.serviceCart.length + index,
      };
    }),
  ];

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
    status: "REQUESTED" as const,
    customerName: payload.customer.name,
    customerPhone: payload.customer.phone,
    customerEmail: payload.customer.email,
    contactPreference: payload.customer.contactPreference,
    note: payload.customer.note || null,
    slotStart: null,
    slotEnd: null,
    requestedDateFrom,
    requestedDateTo,
    preferredTimeWindow: payload.timing.preferredTimeWindow,
    scheduledAt: null,
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
    serviceItems: {
      create: orderServiceItemCreates,
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

  const serviceLabel = payload.serviceCart.map((item) => cartKindLabel[item.kind]).join(" + ");
  const baseServiceLines = payload.serviceCart.map((item) => ({
    name: item.titleDe?.trim() || cartKindLabel[item.kind],
    quantity: Math.max(1, Math.min(50, item.qty || 1)),
    unit: "Leistung",
  }));
  const selectedServiceLines = normalizedSelectedServiceOptions.map((item) => {
    const option = serviceOptionByCode.get(item.code);
    return {
      name: option?.nameDe || item.code,
      quantity: item.qty,
      unit: option?.requiresQuantity ? "Stück" : "pauschal",
    };
  });
  const services =
    baseServiceLines.length + selectedServiceLines.length > 0
      ? [...baseServiceLines, ...selectedServiceLines]
      : [
          {
            name: serviceLabel,
            quantity: 1,
            unit: "Pauschale",
          },
        ];
  const now = new Date();
  const token = nanoid(32);
  const validUntil = addDays(now, OFFER_VALIDITY_DAYS);
  const expiresAt = addDays(now, OFFER_VALIDITY_DAYS);
  const offerNo = deriveOfferNoFromOrderNo(orderNo);
  const netCents = estimate.priceMaxCents;
  const vatCents = Math.round(netCents * 0.19);
  const grossCents = netCents + vatCents;

  const customerAddress =
    payload.startAddress?.displayName ||
    payload.pickupAddress?.displayName ||
    payload.destinationAddress?.displayName ||
    null;

  const { order, offer } = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        ...orderDataBase,
        orderNo,
      },
      select: { id: true, publicId: true, orderNo: true },
    });

    const createdOffer = await tx.offer.create({
      data: {
        token,
        offerNo,
        orderId: createdOrder.id,
        status: "PENDING",
        customerName: payload.customer.name,
        customerEmail: payload.customer.email,
        customerPhone: payload.customer.phone,
        customerAddress,
        moveFrom: payload.startAddress?.displayName || payload.pickupAddress?.displayName || null,
        moveTo: payload.destinationAddress?.displayName || null,
        moveDate: requestedDateFrom,
        floorFrom: payload.accessStart?.floor ?? payload.accessPickup?.floor ?? null,
        floorTo: payload.accessDestination?.floor ?? null,
        elevatorFrom:
          payload.accessStart?.elevator === "small" || payload.accessStart?.elevator === "large",
        elevatorTo:
          payload.accessDestination?.elevator === "small" ||
          payload.accessDestination?.elevator === "large",
        notes: payload.customer.note || null,
        services,
        netCents,
        vatCents,
        grossCents,
        discountPercent: promoRule?.discountType === "PERCENT" ? promoRule.discountValue : null,
        discountCents:
          promoRule?.discountType === "FLAT_CENTS" ? promoRule.discountValue : null,
        discountNote: promoRule ? `Code: ${promoRule.code}` : null,
        validUntil,
        expiresAt,
      },
      select: { id: true, token: true, offerNo: true },
    });

    return {
      order: createdOrder,
      offer: createdOffer,
    };
  });

  const offerUrl = `/offer/${offer.token}`;
  const fullOfferUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}${offerUrl}`;

  try {
    const pdfBuffer = await generateOfferPDF({
      offerId: offer.id,
      offerNo: offer.offerNo || offerNo,
      orderNo,
      offerDate: now,
      validUntil,
      customerName: payload.customer.name,
      customerAddress: customerAddress || undefined,
      customerPhone: payload.customer.phone,
      customerEmail: payload.customer.email,
      moveFrom: payload.startAddress?.displayName || payload.pickupAddress?.displayName || undefined,
      moveTo: payload.destinationAddress?.displayName || undefined,
      moveDate: requestedDateFrom,
      floorFrom: payload.accessStart?.floor ?? payload.accessPickup?.floor ?? undefined,
      floorTo: payload.accessDestination?.floor ?? undefined,
      elevatorFrom:
        payload.accessStart?.elevator === "small" || payload.accessStart?.elevator === "large",
      elevatorTo:
        payload.accessDestination?.elevator === "small" ||
        payload.accessDestination?.elevator === "large",
      notes: payload.customer.note || undefined,
      volumeM3: estimate.totalVolumeM3,
      speed: payload.timing.speed,
      serviceType: toOfferServiceType(payload.serviceType),
      needNoParkingZone:
        payload.accessStart?.needNoParkingZone ||
        payload.accessPickup?.needNoParkingZone ||
        payload.accessDestination?.needNoParkingZone ||
        false,
      addons: payload.addons.map((addon) => addonLabels[addon] ?? addon),
      services,
      netCents,
      vatCents,
      grossCents,
    });

    let agbBuffer: Buffer | null = null;
    try {
      agbBuffer = await generateAGBPDF();
    } catch (e) {
      console.warn("[orders] AGB PDF generation failed:", e);
    }

    try {
      const admin = getSupabaseAdmin();
      const fileName = `${offer.offerNo || offerNo}-${Date.now()}.pdf`;
      const { error: uploadError } = await admin.storage
        .from(STORAGE_BUCKETS.OFFERS)
        .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: false });
      if (!uploadError) {
        const { data } = admin.storage.from(STORAGE_BUCKETS.OFFERS).getPublicUrl(fileName);
        await prisma.offer.update({
          where: { id: offer.id },
          data: { pdfUrl: data.publicUrl },
        });
      } else {
        console.warn("[orders] Offer PDF upload failed:", uploadError.message);
      }
    } catch (uploadErr) {
      console.warn("[orders] Supabase storage unavailable:", uploadErr);
    }

    await sendOfferEmail({
      customerName: payload.customer.name,
      customerEmail: payload.customer.email,
      offerId: offer.id,
      offerNo: offer.offerNo || offerNo,
      offerLink: fullOfferUrl,
      agbLink: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/agb/pdf`,
      validUntil,
      pdfBuffer,
      agbBuffer: agbBuffer || undefined,
    });
  } catch (offerErr) {
    console.error("[orders] Offer PDF/email pipeline failed:", offerErr);
  }

  if (operationalSettings.internalOrderEmailEnabled) {
    try {
      await sendOrderEmail({
        publicId: order.publicId,
        payload,
        estimate,
        requestedDateFrom,
        requestedDateTo,
        preferredTimeWindow: payload.timing.preferredTimeWindow,
        uploadNames: savedUploads.map((u) => u.fileName),
        itemRows: itemRowsForEmail,
        offerNo: offer.offerNo || offerNo,
        offerLink: fullOfferUrl,
      });
    } catch (e) {
      console.error("Company email send failed", e);
    }
  }

  if (operationalSettings.customerConfirmationEmailEnabled) {
    try {
      await sendCustomerConfirmationEmail({
        publicId: order.publicId,
        customerEmail: payload.customer.email,
        customerName: payload.customer.name,
        serviceType: payload.serviceType,
        speed: payload.timing.speed,
        requestedDateFrom,
        requestedDateTo,
        preferredTimeWindow: payload.timing.preferredTimeWindow,
        priceMinCents: estimate.priceMinCents,
        priceMaxCents: estimate.priceMaxCents,
        totalVolumeM3: estimate.totalVolumeM3,
        itemRows: itemRowsForEmail,
        offerNo: offer.offerNo || offerNo,
        offerLink: fullOfferUrl,
        supportPhone: operationalSettings.supportPhone,
        supportEmail: operationalSettings.supportEmail,
        whatsappPhoneE164: operationalSettings.whatsappPhoneE164,
      });
    } catch (e) {
      console.error("Customer confirmation email send failed", e);
    }
  }

  const waUrl = operationalSettings.whatsappEnabled
    ? (() => {
        const message = operationalSettings.whatsappTemplate
          .replace("{context}", bookingContextLabel(payload.bookingContext))
          .replace("{publicId}", order.publicId);
        const waText = encodeURIComponent(message);
        return `https://wa.me/${operationalSettings.whatsappPhoneE164}?text=${waText}`;
      })()
    : null;
  const pdfToken = await signPdfAccessToken(order.publicId);
  const packageTier = payload.packageTier ?? "PLUS";

  return NextResponse.json({
    ok: true,
    publicId: order.publicId,
    orderStatus: "REQUESTED",
    offer: {
      id: offer.id,
      offerNo: offer.offerNo || offerNo,
      token: offer.token,
      url: offerUrl,
    },
    trackingUrl: `/anfrage/${order.publicId}`,
    pdfToken,
    price: `${eur(estimate.priceMinCents)} – ${eur(estimate.priceMaxCents)}`,
    pricingSummary: {
      minCents: estimate.priceMinCents,
      maxCents: estimate.priceMaxCents,
      subtotalCents: estimate.breakdown.subtotalCents,
      totalCents: estimate.breakdown.totalCents,
      vatCents,
      grossCents,
      packageTier,
      serviceCount: payload.serviceCart.length,
    },
    serviceCart: payload.serviceCart,
    whatsappUrl: waUrl,
  });
}


