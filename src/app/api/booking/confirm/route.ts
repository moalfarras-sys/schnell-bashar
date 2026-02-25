import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { prisma } from "@/server/db/prisma";
import { getMailer, getDefaultFrom } from "@/server/email/mailer";
import { generateOfferPDF } from "@/server/pdf/generate-offer";
import { generateAGBPDF } from "@/server/pdf/generate-agb";
import { sendOfferEmail } from "@/server/email/send-offer-email";
import { signPdfAccessToken } from "@/server/auth/admin-session";
import { isRateLimited, requestIp } from "@/lib/spam-protection";
import {
  loadInquirySchedulingContext,
  computeAvailableSlots,
} from "@/server/availability/inquiry-scheduling";
import { getSupabaseAdmin, STORAGE_BUCKETS } from "@/lib/supabase";
import { ORSDistanceError, resolveRouteDistance } from "@/server/distance/ors";
import {
  calculateLegacyPrice,
  type LegacyAddon,
  type LegacyPricing,
} from "@/server/calc/legacy-price";
import {
  deriveOfferNoFromOrderNo,
  nextDocumentNumber,
  orderDisplayNo,
} from "@/server/ids/document-number";

export const runtime = "nodejs";

const OFFER_VALIDITY_DAYS = parseInt(process.env.OFFER_VALIDITY_DAYS || "7");
const legacyAddonSchema = z.enum([
  "PACKING",
  "DISMANTLE_ASSEMBLE",
  "HALTEVERBOT",
  "ENTRUEMPELUNG",
]);

const confirmSchema = z.object({
  inquiry: z.object({
    serviceType: z.enum(["UMZUG", "ENTSORGUNG", "KOMBI"]),
    speed: z.enum(["ECONOMY", "STANDARD", "EXPRESS"]),
    volumeM3: z.number(),
    floors: z.number(),
    hasElevator: z.boolean(),
    needNoParkingZone: z.boolean(),
    addons: z.array(legacyAddonSchema).default([]),
    checklist: z
      .array(
        z.object({
          item: z.string().min(1).max(120),
          actions: z.array(z.enum(["MOVE", "ASSEMBLE", "DISPOSE"])).min(1),
        }),
      )
      .optional()
      .default([]),
    fromAddress: z.string().optional(),
    toAddress: z.string().optional(),
    price: z
      .object({
        netCents: z.number(),
        vatCents: z.number(),
        grossCents: z.number(),
        minCents: z.number(),
        maxCents: z.number(),
      })
      .optional(),
  }),
  slotStart: z.string().datetime(),
  slotEnd: z.string().datetime().optional(),
  customer: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(6).max(30),
  }),
});

function serviceTypeToDb(service: string): "MOVING" | "DISPOSAL" | "BOTH" {
  if (service === "ENTSORGUNG") return "DISPOSAL";
  if (service === "KOMBI") return "BOTH";
  return "MOVING";
}

function serviceTypeLabel(service: "UMZUG" | "ENTSORGUNG" | "KOMBI"): string {
  if (service === "ENTSORGUNG") return "Entsorgung";
  if (service === "KOMBI") return "Umzug + Entsorgung";
  return "Umzug";
}

const addonLabels: Record<LegacyAddon, string> = {
  PACKING: "Packservice",
  DISMANTLE_ASSEMBLE: "Moebelmontage",
  HALTEVERBOT: "Halteverbotszone",
  ENTRUEMPELUNG: "Entruempelung",
};

function fallbackPricing(): LegacyPricing {
  return {
    movingBaseFeeCents: 19000,
    disposalBaseFeeCents: 14000,
    perM3MovingCents: 3400,
    perM3DisposalCents: 4800,
    stairsSurchargePerFloorCents: 2500,
    parkingSurchargeHardCents: 12000,
    uncertaintyPercent: 12,
    economyMultiplier: 0.9,
    standardMultiplier: 1.0,
    expressMultiplier: 1.3,
    perKmCents: 250,
  };
}

export async function POST(req: Request) {
  try {
  const ip = requestIp(req);
  if (isRateLimited(`booking:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte versuchen Sie es in wenigen Minuten erneut." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }

  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue?.path?.join(".") ?? "";
    let message = "Ungueltige Daten";

    if (path === "customer.phone") {
      message = "Telefonnummer ist ungueltig (mindestens 6 Zeichen).";
    } else if (path === "customer.email") {
      message = "E-Mail-Adresse ist ungueltig.";
    } else if (path === "customer.name") {
      message = "Bitte einen gueltigen Namen eingeben (mindestens 2 Zeichen).";
    } else if (path === "slotStart") {
      message = "Bitte einen gueltigen Termin auswaehlen.";
    }

    return NextResponse.json(
      { error: message, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { inquiry, slotStart: slotStartStr, customer } = parsed.data;
  const slotStart = new Date(slotStartStr);

  if (Number.isNaN(slotStart.getTime())) {
    return NextResponse.json({ error: "Ungueltiger Termin." }, { status: 400 });
  }

  const dateStr = formatInTimeZone(slotStart, "Europe/Berlin", "yyyy-MM-dd");

  const loaded = await loadInquirySchedulingContext({
    speed: inquiry.speed as "ECONOMY" | "STANDARD" | "EXPRESS",
    volumeM3: inquiry.volumeM3,
    fromISO: dateStr,
    toISO: dateStr,
  });

  if ("error" in loaded) {
    return NextResponse.json(
      {
        error:
          "Die Terminpruefung ist aktuell nicht verfuegbar. Bitte versuchen Sie es in wenigen Minuten erneut oder kontaktieren Sie uns direkt.",
        details: loaded.error,
      },
      { status: 503 },
    );
  }

  const allowedSlots = computeAvailableSlots(loaded.context, 80);
  const match = allowedSlots.find(
    (s) => Math.abs(s.start.getTime() - slotStart.getTime()) < 60_000,
  );

  if (!match) {
    return NextResponse.json(
      { error: "Der gewaehlte Termin ist nicht mehr verfuegbar. Bitte waehlen Sie einen anderen Zeitpunkt." },
      { status: 409 },
    );
  }

  const slotStartCanonical = match.start;
  const slotEndCanonical = match.end;
  const orderNo = await nextDocumentNumber("ORDER");
  const publicId = orderNo;
  const pricingDb = await prisma.pricingConfig.findFirst({
    where: { active: true },
    orderBy: { updatedAt: "desc" },
    select: {
      movingBaseFeeCents: true,
      disposalBaseFeeCents: true,
      perM3MovingCents: true,
      perM3DisposalCents: true,
      stairsSurchargePerFloorCents: true,
      parkingSurchargeHardCents: true,
      uncertaintyPercent: true,
      economyMultiplier: true,
      standardMultiplier: true,
      expressMultiplier: true,
      perKmCents: true,
    },
  });
  const pricing = pricingDb ?? fallbackPricing();
  const addons = inquiry.addons as LegacyAddon[];
  const checklist = Array.isArray(inquiry.checklist) ? inquiry.checklist : [];

  let distanceKm: number | undefined;
  let distanceSource: "ors" | "cache" | undefined;
  const shouldCalculateDistance =
    inquiry.serviceType === "UMZUG" || inquiry.serviceType === "KOMBI";

  if (shouldCalculateDistance) {
    const fromAddress = inquiry.fromAddress?.trim();
    const toAddress = inquiry.toAddress?.trim();

    if (!fromAddress || !toAddress) {
      return NextResponse.json(
        {
          error:
            "Fuer Umzug oder Kombi sind Start- und Zieladresse (mit PLZ) erforderlich.",
        },
        { status: 400 },
      );
    }

    try {
      const route = await resolveRouteDistance({
        from: { text: fromAddress },
        to: { text: toAddress },
        profile: "driving-car",
      });
      distanceKm = route.distanceKm;
      distanceSource = route.source;
        } catch (error) {
      console.error("[booking/confirm] distance lookup failed:", error);
      const errorMessage =
        error instanceof ORSDistanceError && error.code === "ORS_FORBIDDEN"
          ? "Die Distanzberechnung ist derzeit nicht verfuegbar (ORS-Zugriff abgelehnt). Bitte kontaktieren Sie uns kurz."
          : "Die Distanz zwischen Start und Ziel konnte nicht berechnet werden. Bitte prüfen Sie die Adressen.";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
  }

  const estimate = calculateLegacyPrice(
    {
      serviceType: inquiry.serviceType,
      speed: inquiry.speed,
      volumeM3: inquiry.volumeM3,
      floors: inquiry.floors,
      hasElevator: inquiry.hasElevator,
      needNoParkingZone: inquiry.needNoParkingZone,
      addons,
      distanceKm,
    },
    pricing,
    { distanceSource },
  );

  // -- Create order --
  const orderDataBase = {
    publicId,
    serviceType: serviceTypeToDb(inquiry.serviceType),
    speed: inquiry.speed as "ECONOMY" | "STANDARD" | "EXPRESS",
    status: "CONFIRMED" as const,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    contactPreference: "EMAIL" as const,
    slotStart: slotStartCanonical,
    slotEnd: slotEndCanonical,
    volumeM3: inquiry.volumeM3,
    distanceKm: distanceKm ?? null,
    laborHours: Math.max(1, Math.ceil(inquiry.volumeM3 / 5)),
    priceMinCents: estimate.breakdown.minCents,
    priceMaxCents: estimate.breakdown.maxCents,
    wizardData: {
      source: "preise-flow",
      inquiry: {
        ...inquiry,
        addons,
        checklist,
      },
      distanceKm,
      distanceSource,
      pricingBreakdown: estimate.breakdown,
      customer,
    },
  };

  const order = await prisma.order.create({
    data: {
      ...orderDataBase,
      orderNo,
    },
    select: { id: true, publicId: true, orderNo: true },
  });

  // -- Create offer + send offer email with CTA --
  const now = new Date();
  const token = nanoid(32);
  const offerNo = deriveOfferNoFromOrderNo(orderNo);
  const validUntil = addDays(now, OFFER_VALIDITY_DAYS);
  const expiresAt = addDays(now, OFFER_VALIDITY_DAYS);
  const netCents = estimate.priceNet;
  const vatCents = estimate.vat;
  const grossCents = estimate.priceGross;
  let createdOfferId: string | null = null;

  const services: Array<{ name: string; quantity: number; unit: string }> = [
    {
      name: serviceTypeLabel(inquiry.serviceType),
      quantity: 1,
      unit: `${inquiry.volumeM3} m\u00B3`,
    },
  ];
  if (addons.length > 0) {
    for (const addon of addons) {
      services.push({
        name: addonLabels[addon] ?? addon,
        quantity: 1,
        unit: "pauschal",
      });
    }
  }
  if (checklist.length > 0) {
    for (const entry of checklist) {
      const actions = entry.actions
        .map((action) =>
          action === "MOVE" ? "Transport" : action === "ASSEMBLE" ? "Montage" : "Entsorgung",
        )
        .join(" / ");
      services.push({
        name: `${entry.item} (${actions})`,
        quantity: 1,
        unit: "Checkliste",
      });
    }
  }

  try {
    const offerDataBase = {
      token,
      orderId: order.id,
      status: "PENDING" as const,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: inquiry.fromAddress || null,
      moveFrom: inquiry.fromAddress || null,
      moveTo: inquiry.toAddress || null,
      moveDate: slotStartCanonical,
      floorFrom: inquiry.floors ?? null,
      floorTo: null,
      elevatorFrom: inquiry.hasElevator ?? false,
      elevatorTo: false,
      notes: null,
      services,
      netCents,
      vatCents,
      grossCents,
      validUntil,
      expiresAt,
    };

    const offer = await prisma.offer.create({
      data: {
        ...offerDataBase,
        offerNo,
      },
      select: { id: true },
    });
    createdOfferId = offer.id;

    const pdfBuffer = await generateOfferPDF({
      offerId: offer.id,
      offerNo,
      orderNo: orderDisplayNo(order),
      offerDate: now,
      validUntil,
      customerName: customer.name,
      customerAddress: inquiry.fromAddress,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      moveFrom: inquiry.fromAddress,
      moveTo: inquiry.toAddress,
      moveDate: slotStartCanonical,
      floorFrom: inquiry.floors,
      floorTo: undefined,
      elevatorFrom: inquiry.hasElevator,
      elevatorTo: undefined,
      notes: undefined,
      volumeM3: inquiry.volumeM3,
      speed: inquiry.speed,
      serviceType: inquiry.serviceType,
      needNoParkingZone: inquiry.needNoParkingZone,
      addons: addons.map((addon) => addonLabels[addon] ?? addon),
      checklist: checklist.map((entry) => {
        const actions = entry.actions
          .map((action) =>
            action === "MOVE" ? "Transport" : action === "ASSEMBLE" ? "Montage" : "Entsorgung",
          )
          .join(" / ");
        return `${entry.item} (${actions})`;
      }),
      services,
      netCents,
      vatCents,
      grossCents,
    });

    let agbBuffer: Buffer | null = null;
    try {
      agbBuffer = await generateAGBPDF();
    } catch (e) {
      console.warn("[booking/confirm] AGB PDF failed:", e instanceof Error ? e.message : e);
    }

    // Upload to Supabase if available
    try {
      const admin = getSupabaseAdmin();
      const fileName = `${offerNo}-${Date.now()}.pdf`;
      const { error: uploadError } = await admin.storage
        .from(STORAGE_BUCKETS.OFFERS)
        .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: false });

      if (!uploadError) {
        const { data: urlData } = admin.storage.from(STORAGE_BUCKETS.OFFERS).getPublicUrl(fileName);
        await prisma.offer.update({ where: { id: offer.id }, data: { pdfUrl: urlData.publicUrl } });
      }
    } catch {
      // Supabase not configured - PDF goes via email attachment
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const offerLink = `${baseUrl}/offer/${token}`;

    await sendOfferEmail({
      customerName: customer.name,
      customerEmail: customer.email,
      offerId: offer.id,
      offerNo,
      offerLink,
      agbLink: `${baseUrl}/api/agb/pdf`,
      validUntil,
      pdfBuffer,
      agbBuffer: agbBuffer || undefined,
    });

    console.info(`[booking/confirm] Offer ${offer.id} created`);
  } catch (offerErr) {
    console.error("[booking/confirm] Offer creation failed (order still saved):", offerErr);
  }

  // -- Notify admin --
  const slotLabel = `${formatInTimeZone(slotStartCanonical, "Europe/Berlin", "dd.MM.yyyy HH:mm")} - ${formatInTimeZone(slotEndCanonical, "Europe/Berlin", "HH:mm")}`;
  const transporter = getMailer();
  const from = getDefaultFrom();
  if (transporter) {
    const to = process.env.ORDER_RECEIVER_EMAIL || process.env.SMTP_USER;
    if (to) {
      try {
        await transporter.sendMail({
          to,
          from,
          subject: `Neue Buchung ${order.publicId} - ${serviceTypeLabel(inquiry.serviceType)}`,
          html: `
            <h2>Neue Buchung: ${order.publicId}</h2>
            <p><b>Kunde:</b> ${customer.name}<br/>
            <b>E-Mail:</b> ${customer.email}<br/>
            <b>Telefon:</b> ${customer.phone}</p>
            <p><b>Termin:</b> ${slotLabel}<br/>
            <b>Leistung:</b> ${serviceTypeLabel(inquiry.serviceType)}<br/>
            <b>Volumen:</b> ${inquiry.volumeM3} m\u00B3<br/>
            <b>Preis:</b> ${(grossCents / 100).toFixed(2)} \u20AC</p>
            ${distanceKm != null ? `<p><b>Distanz:</b> ${distanceKm.toFixed(2)} km (${distanceSource ?? "n/a"})</p>` : ""}
            ${inquiry.fromAddress ? `<p><b>Von:</b> ${inquiry.fromAddress}</p>` : ""}
            ${inquiry.toAddress ? `<p><b>Nach:</b> ${inquiry.toAddress}</p>` : ""}
          `,
        });
      } catch (e) {
        console.error("Admin notification email failed:", e);
      }
    }
  }

  const pdfToken = await signPdfAccessToken(order.publicId);

  return NextResponse.json({
    success: true,
    trackingCode: order.publicId,
    offerId: createdOfferId,
    offerNo: createdOfferId ? offerNo : null,
    orderNo: orderNo,
    pdfToken,
  });
  } catch (error) {
    console.error("[booking/confirm] unhandled error:", error);
    return NextResponse.json(
      {
        error:
          "Buchung konnte serverseitig nicht verarbeitet werden. Bitte erneut versuchen.",
      },
      { status: 500 },
    );
  }
}
