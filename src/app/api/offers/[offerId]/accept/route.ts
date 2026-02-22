import { NextRequest, NextResponse } from "next/server";

import { isDocuSignReady } from "@/lib/docusign";
import { STORAGE_BUCKETS, getSupabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/server/db/prisma";
import { sendSigningEmail } from "@/server/email/send-signing-email";
import { generateContractPDF } from "@/server/pdf/generate-contract";
import {
  buildFallbackSigningUrl,
  getFallbackSigningExpiry,
  issueFallbackSigningToken,
} from "@/server/signing/fallback-signing";
import {
  deriveContractNoFromOrderNo,
  deriveOfferNoFromOrderNo,
  orderDisplayNo,
} from "@/server/ids/document-number";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ offerId: string }> },
) {
  try {
    const { offerId } = await context.params;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { order: true },
    });

    if (!offer) {
      return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });
    }

    const now = new Date();
    if (now > offer.expiresAt) {
      return NextResponse.json({ error: "Angebot abgelaufen" }, { status: 400 });
    }

    const docusignReady = isDocuSignReady();
    const orderNo = offer.order ? orderDisplayNo(offer.order) : offer.id;
    const offerNo = offer.offerNo || deriveOfferNoFromOrderNo(orderNo);
    const contractNo = deriveContractNoFromOrderNo(orderNo);

    if (offer.status === "ACCEPTED") {
      const existingContract = await prisma.contract.findUnique({
        where: { offerId },
      });

      if (!existingContract) {
        return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
      }

      if (
        existingContract.signatureProvider === "DOCUSIGN" &&
        existingContract.docusignEnvelopeId
      ) {
        return NextResponse.json({
          success: true,
          alreadyAccepted: true,
          signingUrl: null,
          provider: "DOCUSIGN",
          message:
            "Der Vertrag wurde bereits an DocuSign übermittelt. Bitte prüfen Sie Ihr E-Mail-Postfach auf die DocuSign-Nachricht.",
        });
      }

      if (existingContract.signatureProvider !== "INTERNAL" && existingContract.signingUrl) {
        return NextResponse.json({
          success: true,
          alreadyAccepted: true,
          signingUrl: existingContract.signingUrl,
          provider: existingContract.signatureProvider,
        });
      }

      if (
        existingContract.signatureProvider === "INTERNAL" ||
        !docusignReady ||
        !existingContract.signingUrl
      ) {
        const hasExpiredToken =
          !existingContract.signatureTokenExpiresAt ||
          existingContract.signatureTokenExpiresAt < now;
        const needsInternalRefresh =
          !existingContract.signingUrl ||
          !existingContract.signatureTokenHash ||
          hasExpiredToken;

        if (needsInternalRefresh) {
          const tokenPayload = issueFallbackSigningToken();
          const signingUrl = buildFallbackSigningUrl(tokenPayload.token, offer.token);
          const tokenExpiresAt = getFallbackSigningExpiry(now);

          const patchedContract = await prisma.contract.update({
            where: { id: existingContract.id },
            data: {
              signatureProvider: "INTERNAL",
              docusignStatus: "internal_pending",
              signingUrl,
              signatureTokenHash: tokenPayload.tokenHash,
              signatureTokenExpiresAt: tokenExpiresAt,
              sentForSigningAt: existingContract.sentForSigningAt ?? now,
            },
          });

          const emailResult = await sendSigningEmail({
            customerName: offer.customerName,
            customerEmail: offer.customerEmail,
            signingLink: signingUrl,
            provider: "INTERNAL",
            contractPdfUrl: patchedContract.contractPdfUrl,
          });

          console.log(
            `[signing] provider=INTERNAL link_created=true email_sent=${emailResult.success}`,
          );

          return NextResponse.json({
            success: true,
            alreadyAccepted: true,
            signingUrl,
            provider: "INTERNAL",
            warning: emailResult.success
              ? undefined
              : "Signatur-Link wurde erstellt, aber die E-Mail konnte nicht zugestellt werden.",
          });
        }

        return NextResponse.json({
          success: true,
          alreadyAccepted: true,
          signingUrl: existingContract.signingUrl,
          provider: "INTERNAL",
        });
      }

      return NextResponse.json(
        {
          error:
            "Angebot ist bereits angenommen, aber derzeit ist kein gültiger Signaturpfad verfügbar.",
        },
        { status: 409 },
      );
    }

    await prisma.offer.update({
      where: { id: offerId },
      data: { status: "ACCEPTED", acceptedAt: now },
    });

    const services = offer.services as any[];

    const contractPdfBuffer = await generateContractPDF({
      contractId: contractNo,
      contractNo,
      offerNo,
      orderNo,
      contractDate: now,
      customerName: offer.customerName,
      customerAddress: offer.customerAddress || undefined,
      customerPhone: offer.customerPhone,
      customerEmail: offer.customerEmail,
      moveFrom: offer.moveFrom || undefined,
      moveTo: offer.moveTo || undefined,
      moveDate: offer.moveDate || undefined,
      floorFrom: offer.floorFrom || undefined,
      floorTo: offer.floorTo || undefined,
      elevatorFrom: offer.elevatorFrom,
      elevatorTo: offer.elevatorTo,
      notes: offer.notes || undefined,
      services,
      netCents: offer.netCents,
      vatCents: offer.vatCents,
      grossCents: offer.grossCents,
    });

    let contractPdfUrl: string | null = null;
    try {
      const admin = getSupabaseAdmin();
      const contractFileName = `contract-${contractNo}-${Date.now()}.pdf`;
      const { error: uploadError } = await admin.storage
        .from(STORAGE_BUCKETS.OFFERS)
        .upload(contractFileName, contractPdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (!uploadError) {
        const { data: urlData } = admin.storage.from(STORAGE_BUCKETS.OFFERS).getPublicUrl(contractFileName);
        contractPdfUrl = urlData.publicUrl;
      } else {
        console.warn("[accept] Supabase upload failed:", uploadError.message);
      }
    } catch (err) {
      console.warn("[accept] Supabase storage unavailable:", err instanceof Error ? err.message : err);
    }

    if (!docusignReady) {
      const tokenPayload = issueFallbackSigningToken();
      const signingUrl = buildFallbackSigningUrl(tokenPayload.token, offer.token);
      const tokenExpiresAt = getFallbackSigningExpiry(now);

      const contractDataBase = {
        offerId: offer.id,
        status: "PENDING_SIGNATURE" as const,
        signatureProvider: "INTERNAL" as const,
        docusignEnvelopeId: null,
        docusignStatus: "internal_pending",
        contractPdfUrl,
        signingUrl,
        signatureTokenHash: tokenPayload.tokenHash,
        signatureTokenExpiresAt: tokenExpiresAt,
        sentForSigningAt: now,
      };
      const contract = await prisma.contract.create({
        data: {
          ...contractDataBase,
          contractNo,
        },
      });

      const emailResult = await sendSigningEmail({
        customerName: offer.customerName,
        customerEmail: offer.customerEmail,
        signingLink: signingUrl,
        provider: "INTERNAL",
        contractPdfUrl,
      });

      console.log(
        `[signing] provider=INTERNAL link_created=true email_sent=${emailResult.success}`,
      );

      return NextResponse.json({
        success: true,
        contractId: contract.id,
        signingUrl,
        provider: "INTERNAL",
        warning: emailResult.success
          ? undefined
          : "Vertrag wurde erstellt, aber der Signatur-Link konnte nicht per E-Mail zugestellt werden.",
      });
    }

    const { getDocuSignAccountId, getEnvelopesApi } = await import("@/lib/docusign");
    const docusign = (await import("docusign-esign")).default;

    const envelopesApi = await getEnvelopesApi();
    const accountId = getDocuSignAccountId();

    const envelopeDefinition = new docusign.EnvelopeDefinition();
    envelopeDefinition.emailSubject = "Umzugsvertrag - Schnell Sicher Umzug";
    envelopeDefinition.status = "sent";

    const document = new docusign.Document();
    document.documentBase64 = contractPdfBuffer.toString("base64");
    document.name = `Umzugsvertrag-${contractNo}.pdf`;
    document.fileExtension = "pdf";
    document.documentId = "1";
    envelopeDefinition.documents = [document];

    const signer = new docusign.Signer();
    signer.email = offer.customerEmail;
    signer.name = offer.customerName;
    signer.recipientId = "1";
    signer.routingOrder = "1";

    const signHere = new docusign.SignHere();
    signHere.documentId = "1";
    signHere.pageNumber = "1";
    signHere.recipientId = "1";
    signHere.tabLabel = "SignHereTab";
    signHere.xPosition = "100";
    signHere.yPosition = "700";

    const signHereTabs = new docusign.Tabs();
    signHereTabs.signHereTabs = [signHere];
    signer.tabs = signHereTabs;

    const recipients = new docusign.Recipients();
    recipients.signers = [signer];
    envelopeDefinition.recipients = recipients;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const eventNotification = new docusign.EventNotification();
    eventNotification.url = `${baseUrl}/api/docusign/webhook`;
    eventNotification.loggingEnabled = "true";
    eventNotification.requireAcknowledgment = "true";
    eventNotification.useSoapInterface = "false";
    eventNotification.includeCertificateWithSoap = "false";
    eventNotification.signMessageWithX509Cert = "false";
    eventNotification.includeDocuments = "true";
    eventNotification.includeEnvelopeVoidReason = "true";
    eventNotification.includeTimeZone = "true";
    eventNotification.includeSenderAccountAsCustomField = "true";
    eventNotification.includeDocumentFields = "true";
    eventNotification.includeCertificateOfCompletion = "true";

    const envelopeEvent = new docusign.EnvelopeEvent();
    envelopeEvent.envelopeEventStatusCode = "completed";
    eventNotification.envelopeEvents = [envelopeEvent];
    envelopeDefinition.eventNotification = eventNotification;

    const results = await envelopesApi.createEnvelope(accountId, {
      envelopeDefinition,
    });

    const envelopeId = results.envelopeId!;

    const contractDataBase = {
      offerId: offer.id,
      status: "PENDING_SIGNATURE" as const,
      signatureProvider: "DOCUSIGN" as const,
      docusignEnvelopeId: envelopeId,
      docusignStatus: "sent",
      contractPdfUrl,
      signingUrl: null,
      sentForSigningAt: now,
    };
    const contract = await prisma.contract.create({
      data: {
        ...contractDataBase,
        contractNo,
      },
    });

    const signingEmailResult = await sendSigningEmail({
      customerName: offer.customerName,
      customerEmail: offer.customerEmail,
      provider: "DOCUSIGN",
      contractPdfUrl,
    });

    console.log(
      `[signing] provider=DOCUSIGN remote=true envelope_sent=true email_sent=${signingEmailResult.success}`,
    );

    if (!signingEmailResult.success) {
      return NextResponse.json({
        success: true,
        contractId: contract.id,
        signingUrl: null,
        provider: "DOCUSIGN",
        warning:
          "DocuSign wurde gestartet, aber unsere Hinweis-E-Mail konnte nicht zugestellt werden. Bitte prüfen Sie Ihr Postfach auf die DocuSign-Nachricht oder senden Sie aus dem Admin-Bereich erneut.",
      });
    }

    return NextResponse.json({
      success: true,
      contractId: contract.id,
      signingUrl: null,
      provider: "DOCUSIGN",
      message:
        "Der Signaturprozess wurde via DocuSign gestartet. Bitte prüfen Sie Ihr E-Mail-Postfach auf die DocuSign-Nachricht.",
    });
  } catch (error) {
    console.error("[accept] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Verarbeiten des Angebots" },
      { status: 500 },
    );
  }
}
