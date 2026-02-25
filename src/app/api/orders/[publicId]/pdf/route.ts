import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { formatInTimeZone } from "date-fns-tz";

import { prisma } from "@/server/db/prisma";
import { generateOfferPDF } from "@/server/pdf/generate-offer";
import { generateQuotePdf } from "@/server/pdf/generate-quote";
import { offerDisplayNo, orderDisplayNo } from "@/server/ids/document-number";
import { formatRequestedWindow } from "@/lib/schedule-format";
import {
  adminCookieName,
  verifyAdminToken,
  verifyPdfAccessToken,
} from "@/server/auth/admin-session";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await ctx.params;

  let isAuthorized = false;

  // 1. Admin cookie
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(adminCookieName())?.value;
  if (adminToken) {
    try {
      await verifyAdminToken(adminToken);
      isAuthorized = true;
    } catch {
      // Token invalid or expired
    }
  }

  // 2. Signed PDF access token (for customers after order submission)
  if (!isAuthorized) {
    const url = new URL(req.url);
    const accessToken = url.searchParams.get("token");
    if (accessToken) {
      try {
        const { publicId: tokenPublicId } = await verifyPdfAccessToken(accessToken);
        if (tokenPublicId === publicId) {
          isAuthorized = true;
        }
      } catch {
        // Token invalid
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Zugriff nicht autorisiert." }, { status: 401 });
  }

  const order = await prisma.order.findUnique({
    where: { publicId },
    include: {
      lines: { include: { catalogItem: true } },
      offer: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order nicht gefunden." }, { status: 404 });
  }

  const net = order.priceMaxCents;
  const vat = Math.round(net * 0.19);
  const gross = net + vat;

  let buffer: Buffer;
  try {
    if (order.offer) {
      const offer = order.offer;
      const wizardData = (order.wizardData as { inquiry?: Record<string, unknown> } | null) || {};
      const inquiry = wizardData.inquiry || {};
      const services = Array.isArray(offer.services) ? offer.services : [];
      const inquiryVolume =
        typeof inquiry["volumeM3"] === "number" ? inquiry["volumeM3"] : undefined;
      const inquirySpeed =
        typeof inquiry["speed"] === "string" ? inquiry["speed"] : undefined;
      const inquiryServiceType =
        typeof inquiry["serviceType"] === "string" ? inquiry["serviceType"] : undefined;
      const inquiryNoParking =
        typeof inquiry["needNoParkingZone"] === "boolean"
          ? inquiry["needNoParkingZone"]
          : false;
      const inquiryAddons =
        Array.isArray(inquiry["addons"]) && inquiry["addons"].every((addon) => typeof addon === "string")
          ? (inquiry["addons"] as string[])
          : [];
      const inquiryChecklist =
        Array.isArray(inquiry["checklist"])
          ? (inquiry["checklist"] as Array<{ item?: string; actions?: string[] }>).flatMap((entry) => {
              if (!entry?.item || !Array.isArray(entry.actions) || entry.actions.length === 0) return [];
              return [`${entry.item} (${entry.actions.join(" / ")})`];
            })
          : [];
      const orderNo = orderDisplayNo(order);
      const displayOfferNo = offerDisplayNo({
        offerNo: offer.offerNo,
        id: offer.id,
        orderNo: order.orderNo ?? null,
        orderPublicId: order.publicId,
      });

      buffer = await generateOfferPDF({
        offerId: offer.id,
        offerNo: displayOfferNo,
        orderNo,
        offerDate: offer.createdAt,
        validUntil: offer.validUntil,
        customerName: offer.customerName,
        customerAddress: offer.customerAddress || undefined,
        customerPhone: offer.customerPhone || "",
        customerEmail: offer.customerEmail || "",
        moveFrom: offer.moveFrom || undefined,
        moveTo: offer.moveTo || undefined,
        moveDate: offer.moveDate || undefined,
        floorFrom: offer.floorFrom ?? undefined,
        floorTo: offer.floorTo ?? undefined,
        elevatorFrom: offer.elevatorFrom,
        elevatorTo: offer.elevatorTo,
        notes: offer.notes || undefined,
        volumeM3: order.volumeM3 || inquiryVolume,
        speed: order.speed || inquirySpeed,
        serviceType: inquiryServiceType,
        needNoParkingZone: inquiryNoParking,
        addons: inquiryAddons,
        checklist: inquiryChecklist,
        services: services as Array<{
          name: string;
          description?: string;
          quantity?: number;
          unit?: string;
          priceCents?: number;
        }>,
        netCents: offer.netCents,
        vatCents: offer.vatCents,
        grossCents: offer.grossCents,
      });
    } else {
      const wizardData = (order.wizardData as
        | {
            selectedServiceOptions?: Array<{ code?: string; qty?: number }>;
            pricingBreakdownV2?: { serviceOptionsCents?: number };
          }
        | null) ?? { selectedServiceOptions: [] };

      const selectedServiceOptions = Array.isArray(wizardData.selectedServiceOptions)
        ? wizardData.selectedServiceOptions
            .map((entry) => ({
              code: String(entry?.code ?? "").trim(),
              qty: Math.max(1, Number(entry?.qty ?? 1)),
            }))
            .filter((entry) => entry.code.length > 0)
        : [];

      const optionCodes = [...new Set(selectedServiceOptions.map((entry) => entry.code))];
      const optionRows =
        optionCodes.length > 0
          ? await prisma.serviceOption.findMany({
              where: { code: { in: optionCodes } },
              select: { code: true, nameDe: true },
            })
          : [];
      const optionNameByCode = new Map(optionRows.map((row) => [row.code, row.nameDe]));

      const optionTotalPool = Math.max(
        0,
        Number(wizardData.pricingBreakdownV2?.serviceOptionsCents ?? 0),
      );
      const optionQtyTotal = selectedServiceOptions.reduce((sum, entry) => sum + entry.qty, 0);
      let optionPoolRemaining = optionTotalPool;
      const serviceOptionLines = selectedServiceOptions.map((entry, index) => {
        const lineTotal =
          index === selectedServiceOptions.length - 1
            ? optionPoolRemaining
            : optionQtyTotal > 0
              ? Math.round((optionTotalPool * entry.qty) / optionQtyTotal)
              : 0;
        optionPoolRemaining = Math.max(0, optionPoolRemaining - lineTotal);
        const unitCents = entry.qty > 0 ? Math.round(lineTotal / entry.qty) : lineTotal;
        return {
          label: optionNameByCode.get(entry.code) ?? entry.code,
          qty: entry.qty,
          unit: Math.round(unitCents / 100),
          total: lineTotal,
        };
      });

      const catalogPool = Math.max(0, order.priceMaxCents - optionTotalPool);
      const catalogWeightTotal = order.lines.reduce((sum, line) => sum + Math.max(line.qty, 1), 0);
      let catalogPoolRemaining = catalogPool;
      const catalogLines = order.lines.map((line, index) => {
        const weight = Math.max(line.qty, 1);
        const lineTotal =
          index === order.lines.length - 1
            ? catalogPoolRemaining
            : catalogWeightTotal > 0
              ? Math.round((catalogPool * weight) / catalogWeightTotal)
              : 0;
        catalogPoolRemaining = Math.max(0, catalogPoolRemaining - lineTotal);

        return {
          label: line.catalogItem.nameDe,
          qty: line.qty,
          unit: Math.round((line.lineVolumeM3 / Math.max(line.qty, 1)) * 100),
          total: lineTotal,
        };
      });

      buffer = await generateQuotePdf({
        publicId: order.publicId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        serviceType: order.serviceType,
        speed: order.speed,
        slotLabel:
          (order.slotStart && order.slotEnd
            ? `${formatInTimeZone(order.slotStart, "Europe/Berlin", "dd.MM.yyyy HH:mm")} - ${formatInTimeZone(order.slotEnd, "Europe/Berlin", "HH:mm")}`
            : formatRequestedWindow(
                order.requestedDateFrom,
                order.requestedDateTo,
                order.preferredTimeWindow,
              )) || "Termin angefragt",
        lines: [...catalogLines, ...serviceOptionLines],
        netCents: net,
        vatCents: vat,
        grossCents: gross,
      });
    }
  } catch (err) {
    console.error("PDF generation failed:", err);
    return NextResponse.json({ error: "PDF-Generierung fehlgeschlagen." }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${order.orderNo ?? order.publicId}-angebot.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
