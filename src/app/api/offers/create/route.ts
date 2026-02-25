import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { addDays } from "date-fns";
import { prisma } from "@/server/db/prisma";
import { getSupabaseAdmin, STORAGE_BUCKETS } from "@/lib/supabase";
import { generateOfferPDF } from "@/server/pdf/generate-offer";
import { generateAGBPDF } from "@/server/pdf/generate-agb";
import { sendOfferEmail } from "@/server/email/send-offer-email";
import {
  deriveOfferNoFromOrderNo,
  orderDisplayNo,
} from "@/server/ids/document-number";

const OFFER_VALIDITY_DAYS = parseInt(process.env.OFFER_VALIDITY_DAYS || "7");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Auftrags-ID ist erforderlich." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lines: {
          include: {
            catalogItem: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
    }

    const existingOffer = await prisma.offer.findUnique({
      where: { orderId },
    });

    if (existingOffer) {
      return NextResponse.json(
        { error: "Für diesen Auftrag existiert bereits ein Angebot." },
        { status: 400 },
      );
    }

    const token = nanoid(32);
    const now = new Date();
    const validUntil = addDays(now, OFFER_VALIDITY_DAYS);
    const expiresAt = addDays(now, OFFER_VALIDITY_DAYS);
    const orderNo = orderDisplayNo(order);
    const offerNo = deriveOfferNoFromOrderNo(orderNo);

    const wizardData = order.wizardData as any;
    const inquiry = wizardData?.inquiry || {};

    const netCents = order.priceMaxCents;
    const vatCents = Math.round(netCents * 0.19);
    const grossCents = netCents + vatCents;

    const services = order.lines.map((line) => ({
      name: line.catalogItem.nameDe,
      quantity: line.qty,
      unit: "St\u00FCck",
    }));

    const offerDataBase = {
      token,
      orderId: order.id,
      status: "PENDING" as const,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      customerAddress: inquiry.fromAddress || wizardData?.addresses?.from || null,
      moveFrom: inquiry.fromAddress || wizardData?.addresses?.from || null,
      moveTo: inquiry.toAddress || wizardData?.addresses?.to || null,
      moveDate: order.slotStart,
      floorFrom: inquiry.floors ?? wizardData?.floors?.from ?? null,
      floorTo: wizardData?.floors?.to ?? null,
      elevatorFrom: inquiry.hasElevator ?? wizardData?.elevators?.from ?? false,
      elevatorTo: wizardData?.elevators?.to ?? false,
      notes: order.note || null,
      services: services,
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
    });

    const pdfBuffer = await generateOfferPDF({
      offerId: offer.id,
      offerNo,
      orderNo,
      offerDate: now,
      validUntil,
      customerName: order.customerName,
      customerAddress: inquiry.fromAddress || wizardData?.addresses?.from || undefined,
      customerPhone: order.customerPhone ?? "",
      customerEmail: order.customerEmail ?? "",
      moveFrom: inquiry.fromAddress || wizardData?.addresses?.from || undefined,
      moveTo: inquiry.toAddress || wizardData?.addresses?.to || undefined,
      moveDate: order.slotStart ?? undefined,
      moveTime: undefined,
      floorFrom: inquiry.floors ?? wizardData?.floors?.from ?? undefined,
      floorTo: wizardData?.floors?.to ?? undefined,
      elevatorFrom: inquiry.hasElevator ?? wizardData?.elevators?.from ?? undefined,
      elevatorTo: wizardData?.elevators?.to ?? undefined,
      notes: order.note ?? undefined,
      volumeM3: order.volumeM3 || inquiry.volumeM3,
      speed: order.speed || inquiry.speed,
      serviceType: inquiry.serviceType,
      needNoParkingZone: inquiry.needNoParkingZone,
      addons: inquiry.addons,
      checklist: Array.isArray(inquiry.checklist)
        ? inquiry.checklist
            .flatMap((entry: { item?: string; actions?: string[] }) => {
              if (!entry?.item || !Array.isArray(entry.actions) || entry.actions.length === 0) return [];
              const actions = entry.actions.join(" / ");
              return [`${entry.item} (${actions})`];
            })
        : [],
      services,
      netCents,
      vatCents,
      grossCents,
    });

    let agbBuffer: Buffer | null = null;
    try {
      agbBuffer = await generateAGBPDF();
    } catch (err) {
      console.warn("[offers/create] AGB PDF generation failed:", err instanceof Error ? err.message : err);
    }

    let pdfUrl: string | null = null;
    try {
      const admin = getSupabaseAdmin();
      const fileName = `${offerNo}-${Date.now()}.pdf`;
      const { error: uploadError } = await admin.storage
        .from(STORAGE_BUCKETS.OFFERS)
        .upload(fileName, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("[offers/create] Failed to upload PDF to Supabase:", uploadError);
      } else {
        const { data: urlData } = admin.storage
          .from(STORAGE_BUCKETS.OFFERS)
          .getPublicUrl(fileName);
        pdfUrl = urlData.publicUrl;
      }
    } catch (err) {
      console.warn("[offers/create] Supabase storage unavailable, PDF attached to email only:", err instanceof Error ? err.message : err);
    }

    if (pdfUrl) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: { pdfUrl },
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const offerLink = `${baseUrl}/offer/${token}`;
    const agbLink = `${baseUrl}/api/agb/pdf`;

    const emailResult = await sendOfferEmail({
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      offerId: offer.id,
      offerNo,
      offerLink,
      agbLink,
      validUntil,
      pdfBuffer,
      agbBuffer: agbBuffer || undefined,
    });

    if (!emailResult.success) {
      console.error("[offers/create] Email failed:", emailResult.error);
      return NextResponse.json(
        {
          success: true,
          offerId: offer.id,
          offerNo,
          token: offer.token,
          offerLink,
          emailSent: false,
          emailError: "SMTP nicht konfiguriert oder fehlgeschlagen. Bitte .env pr\u00FCfen.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      success: true,
      offerId: offer.id,
      offerNo,
      token: offer.token,
      offerLink,
    });
  } catch (error) {
    console.error("Error creating offer:", error);
    return NextResponse.json(
      { error: "Angebot konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}

