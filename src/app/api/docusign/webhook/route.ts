import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/server/db/prisma";
import { getSupabaseAdmin, STORAGE_BUCKETS } from "@/lib/supabase";
import { getEnvelopesApi, getDocuSignAccountId } from "@/lib/docusign";
import { sendSignedContractEmail } from "@/server/email/send-signed-contract-email";
import { createInvoiceFromContract } from "@/server/accounting/create-invoice-from-contract";

function verifyHmac(secret: string, rawBody: Buffer, signatureHeader: string): boolean {
  const computed = createHmac("sha256", secret).update(rawBody).digest("base64");
  const expected = Buffer.from(computed, "utf8");
  const received = Buffer.from(signatureHeader, "utf8");
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer());

  const webhookSecret = process.env.DOCUSIGN_WEBHOOK_SECRET;
  if (webhookSecret) {
    const sig1 = req.headers.get("x-docusign-signature-1");
    const sig2 = req.headers.get("x-docusign-signature-2");
    const sig3 = req.headers.get("x-docusign-signature-3");

    const isValid =
      (sig1 && verifyHmac(webhookSecret, rawBody, sig1)) ||
      (sig2 && verifyHmac(webhookSecret, rawBody, sig2)) ||
      (sig3 && verifyHmac(webhookSecret, rawBody, sig3));

    if (!isValid) {
      console.error(
        `[DocuSign webhook] HMAC verification failed. ` +
          `IP: ${req.headers.get("x-forwarded-for") || "unknown"}, ` +
          `sig1: ${sig1 ? "present" : "missing"}, ` +
          `sig2: ${sig2 ? "present" : "missing"}, ` +
          `sig3: ${sig3 ? "present" : "missing"}`,
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error(
      "[DocuSign webhook] CRITICAL: DOCUSIGN_WEBHOOK_SECRET fehlt in Produktion. Webhook ist nicht signatur-geschützt.",
    );
  }

  try {
    const body = JSON.parse(rawBody.toString("utf8"));

    console.log("DocuSign webhook received:", JSON.stringify(body, null, 2));

    const envelopeId =
      body.data?.envelopeId ||
      body.envelopeId ||
      body.envelopeSummary?.envelopeId ||
      body.data?.envelopeSummary?.envelopeId;
    const status =
      body.data?.envelopeSummary?.status ||
      body.status ||
      body.envelopeSummary?.status ||
      body.data?.status;
    const normalizedStatus = typeof status === "string" ? status.toLowerCase() : null;

    if (!envelopeId) {
      console.error("No envelope ID in webhook");
      return NextResponse.json({ error: "Keine Envelope-ID vorhanden" }, { status: 400 });
    }

    const contract = await prisma.contract.findUnique({
      where: { docusignEnvelopeId: envelopeId },
      include: {
        offer: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!contract) {
      console.error(`Contract not found for envelope ${envelopeId}`);
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        docusignStatus: normalizedStatus || "unknown",
      },
    });

    if (normalizedStatus === "completed" && contract.status === "SIGNED") {
      return NextResponse.json({ success: true, duplicate: true });
    }

    if (normalizedStatus === "completed") {
      const envelopesApi = await getEnvelopesApi();
      const accountId = getDocuSignAccountId();

      const signedPdfResponse = await envelopesApi.getDocument(
        accountId,
        envelopeId,
        "combined",
      );

      const signedPdfBuffer = Buffer.from(signedPdfResponse as any);

      const admin = getSupabaseAdmin();
      const signedFileName = `signed-contract-${contract.id}-${Date.now()}.pdf`;
      const { error: uploadError } = await admin.storage
        .from(STORAGE_BUCKETS.SIGNED_CONTRACTS)
        .upload(signedFileName, signedPdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("Failed to upload signed PDF:", uploadError);
        throw new Error("Failed to upload signed PDF");
      }

      const { data: urlData } = admin.storage
        .from(STORAGE_BUCKETS.SIGNED_CONTRACTS)
        .getPublicUrl(signedFileName);

      const signedPdfUrl = urlData.publicUrl;

      let auditTrailUrl: string | null = null;
      try {
        const auditTrailResponse = await envelopesApi.getDocument(
          accountId,
          envelopeId,
          "certificate",
        );

        const auditTrailBuffer = Buffer.from(auditTrailResponse as any);

        const auditFileName = `audit-trail-${contract.id}-${Date.now()}.pdf`;
        const { error: auditUploadError } = await admin.storage
          .from(STORAGE_BUCKETS.SIGNED_CONTRACTS)
          .upload(auditFileName, auditTrailBuffer, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (!auditUploadError) {
          const { data: auditUrlData } = admin.storage
            .from(STORAGE_BUCKETS.SIGNED_CONTRACTS)
            .getPublicUrl(auditFileName);

          auditTrailUrl = auditUrlData.publicUrl;
        }
      } catch (error) {
        console.error("Failed to download audit trail:", error);
      }

      await prisma.contract.update({
        where: { id: contract.id },
        data: {
          status: "SIGNED",
          docusignStatus: "completed",
          signedPdfUrl,
          auditTrailUrl,
          signedAt: new Date(),
        },
      });

      await sendSignedContractEmail({
        customerName: contract.offer.customerName,
        customerEmail: contract.offer.customerEmail,
        contractId: contract.id,
        pdfBuffer: signedPdfBuffer,
      });

      const adminEmail = process.env.ORDER_RECEIVER_EMAIL || "kontakt@schnellsicherumzug.de";
      await sendSignedContractEmail({
        customerName: "Admin",
        customerEmail: adminEmail,
        contractId: contract.id,
        pdfBuffer: signedPdfBuffer,
      });

      await createInvoiceFromContract(contract.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing DocuSign webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


