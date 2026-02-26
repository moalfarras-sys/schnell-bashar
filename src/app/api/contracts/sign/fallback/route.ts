import { NextRequest, NextResponse } from "next/server";

import path from "path";
import { mkdirSync, writeFileSync } from "fs";

import { getSupabaseAdmin, STORAGE_BUCKETS } from "@/lib/supabase";
import { prisma } from "@/server/db/prisma";
import {
  contractDisplayNo,
  offerDisplayNo,
  orderDisplayNo,
} from "@/server/ids/document-number";
import { sendSignedContractEmail } from "@/server/email/send-signed-contract-email";
import { generateContractPDF } from "@/server/pdf/generate-contract";
import { hashFallbackSigningToken, parseClientIp } from "@/server/signing/fallback-signing";
import { createInvoiceFromContract } from "@/server/accounting/create-invoice-from-contract";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const signedName = typeof body.signedName === "string" ? body.signedName.trim() : "";
    const agbAccepted = body.agbAccepted === true;
    const signatureDataUrl =
      typeof body.signatureDataUrl === "string" && body.signatureDataUrl.startsWith("data:image/")
        ? body.signatureDataUrl
        : null;

    if (!token) {
      return NextResponse.json(
        { error: "Signatur-Token fehlt", code: "TOKEN_MISSING" },
        { status: 400 },
      );
    }
    if (!signedName || signedName.length < 2) {
      return NextResponse.json(
        { error: "Bitte geben Sie Ihren Namen ein", code: "NAME_REQUIRED" },
        { status: 400 },
      );
    }
    if (!agbAccepted) {
      return NextResponse.json(
        { error: "Bitte akzeptieren Sie die AGB", code: "AGB_REQUIRED" },
        { status: 400 },
      );
    }

    const tokenHash = hashFallbackSigningToken(token);

    const contract = await prisma.contract.findFirst({
      where: {
        signatureTokenHash: tokenHash,
      },
      include: {
        offer: {
          select: {
            id: true,
            token: true,
            offerNo: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            customerAddress: true,
            moveFrom: true,
            moveTo: true,
            moveDate: true,
            floorFrom: true,
            floorTo: true,
            elevatorFrom: true,
            elevatorTo: true,
            notes: true,
            services: true,
            netCents: true,
            vatCents: true,
            grossCents: true,
            order: {
              select: {
                orderNo: true,
                publicId: true,
              },
            },
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Ungültiger oder bereits verwendeter Signatur-Link", code: "TOKEN_INVALID" },
        { status: 404 },
      );
    }

    if (contract.status !== "PENDING_SIGNATURE") {
      return NextResponse.json(
        { error: "Vertrag ist nicht mehr offen zur Unterschrift", code: "STATUS_INVALID" },
        { status: 409 },
      );
    }

    if (!contract.signatureTokenExpiresAt || contract.signatureTokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "Der Signatur-Link ist abgelaufen", code: "TOKEN_EXPIRED" },
        { status: 410 },
      );
    }

    const now = new Date();
    const ip = parseClientIp(req.headers.get("x-forwarded-for"), req.headers.get("x-real-ip"));
    const userAgent = req.headers.get("user-agent");

    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: "SIGNED",
        signedAt: now,
        docusignStatus:
          contract.signatureProvider === "INTERNAL" ? "internal_signed" : contract.docusignStatus,
        fallbackSignedName: signedName,
        fallbackSignedAt: now,
        fallbackSignerIp: ip,
        fallbackSignerUserAgent: userAgent,
        fallbackAgbAccepted: true,
        signatureImageUrl: signatureDataUrl,
        signatureTokenHash: null,
        signatureTokenExpiresAt: null,
      },
    });

    let signedPdfUrl: string | null = null;
    let signedPdfStorage: "remote" | "local" | "none" = "none";
    try {
      const displayOrderNo = contract.offer.order ? orderDisplayNo(contract.offer.order) : contract.offer.id;
      const displayOfferNo = offerDisplayNo({
        offerNo: contract.offer.offerNo,
        id: contract.offer.id,
        orderNo: contract.offer.order?.orderNo ?? null,
        orderPublicId: contract.offer.order?.publicId ?? null,
      });
      const displayContractNo = contractDisplayNo({
        contractNo: contract.contractNo,
        id: contract.id,
        orderNo: contract.offer.order?.orderNo ?? null,
        orderPublicId: contract.offer.order?.publicId ?? null,
      });

      const signedPdfBuffer = await generateContractPDF({
        contractId: contract.id,
        contractNo: displayContractNo,
        offerNo: displayOfferNo,
        orderNo: displayOrderNo,
        contractDate: contract.createdAt,
        signedAt: updated.signedAt ?? undefined,
        customerName: contract.offer.customerName,
        customerAddress: contract.offer.customerAddress || undefined,
        customerPhone: contract.offer.customerPhone || "",
        customerEmail: contract.offer.customerEmail || "",
        moveFrom: contract.offer.moveFrom || undefined,
        moveTo: contract.offer.moveTo || undefined,
        moveDate: contract.offer.moveDate || undefined,
        floorFrom: contract.offer.floorFrom || undefined,
        floorTo: contract.offer.floorTo || undefined,
        elevatorFrom: contract.offer.elevatorFrom || false,
        elevatorTo: contract.offer.elevatorTo || false,
        notes: contract.offer.notes || undefined,
        services: Array.isArray(contract.offer.services)
          ? (contract.offer.services as Array<{
              name: string;
              description?: string;
              quantity?: number;
              unit?: string;
            }>)
          : [],
        netCents: contract.offer.netCents,
        vatCents: contract.offer.vatCents,
        grossCents: contract.offer.grossCents,
        customerSignatureDataUrl: signatureDataUrl || undefined,
        customerSignedName: signedName,
      });

      try {
        const admin = getSupabaseAdmin();
        const signedFileName = `signed-contract-${displayContractNo}-${Date.now()}.pdf`;
        const { error: uploadError } = await admin.storage
          .from(STORAGE_BUCKETS.SIGNED_CONTRACTS)
          .upload(signedFileName, signedPdfBuffer, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (!uploadError) {
          const { data: urlData } = admin.storage
            .from(STORAGE_BUCKETS.SIGNED_CONTRACTS)
            .getPublicUrl(signedFileName);
          signedPdfUrl = urlData.publicUrl;
          signedPdfStorage = "remote";
        } else {
          console.warn("[fallback-sign] Signed PDF upload failed:", uploadError.message);
        }
      } catch (uploadErr) {
        console.warn(
          "[fallback-sign] Supabase upload unavailable:",
          uploadErr instanceof Error ? uploadErr.message : uploadErr,
        );
      }

      if (!signedPdfUrl) {
        try {
          const dir = path.join(process.cwd(), "public", "uploads", "signed-contracts");
          mkdirSync(dir, { recursive: true });
          const localFile = `signed-contract-${displayContractNo}-${Date.now()}.pdf`;
          writeFileSync(path.join(dir, localFile), signedPdfBuffer);
          signedPdfUrl = `/uploads/signed-contracts/${localFile}`;
          signedPdfStorage = "local";
          console.info("[fallback-sign] Signed PDF saved locally:", signedPdfUrl);
        } catch (localErr) {
          console.error(
            "[fallback-sign] Local PDF save failed:",
            localErr instanceof Error ? localErr.message : localErr,
          );
        }
      }

      await prisma.contract.update({
        where: { id: contract.id },
        data: {
          signedPdfUrl,
        },
      });

      console.info("[fallback-sign] Signed PDF finalized", {
        contractId: contract.id,
        storage: signedPdfStorage,
        signedPdfUrl,
      });

      await sendSignedContractEmail({
        customerName: contract.offer.customerName,
        customerEmail: contract.offer.customerEmail,
        contractId: displayContractNo,
        pdfBuffer: signedPdfBuffer,
      });

      const adminEmail = process.env.ORDER_RECEIVER_EMAIL || "kontakt@schnellsicherumzug.de";
      await sendSignedContractEmail({
        customerName: "Admin",
        customerEmail: adminEmail,
        contractId: displayContractNo,
        pdfBuffer: signedPdfBuffer,
      });
    } catch (pdfErr) {
      console.error(
        "[fallback-sign] Signed PDF/email pipeline failed:",
        pdfErr instanceof Error ? pdfErr.message : pdfErr,
      );
    }

    await createInvoiceFromContract(updated.id);

    return NextResponse.json({
      success: true,
      signedAt: updated.signedAt,
      contractId: updated.id,
      offerToken: contract.offer.token,
      pdfUrl: `/api/contracts/signature/${contract.offer.token}/pdf?kind=signed`,
      signedPdfUrl: signedPdfUrl || updated.signedPdfUrl || null,
    });
  } catch (error) {
    console.error("[fallback-sign] Error:", error);
    return NextResponse.json(
      { error: "Unterschrift konnte nicht gespeichert werden", code: "UNKNOWN" },
      { status: 500 },
    );
  }
}

