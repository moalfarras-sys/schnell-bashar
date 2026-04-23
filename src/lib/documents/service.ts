import type { DocumentStatus, Prisma } from "../../../prisma/generated/prisma/client";

import { calculateTotals } from "@/lib/documents/calculations";
import { writeDocumentAuditLog } from "@/lib/documents/audit";
import { generateDocumentNumber } from "@/lib/documents/numbering";
import { documentPayloadSchema } from "@/lib/documents/schemas";
import { createDocumentHash, issueSigningToken } from "@/lib/documents/signature";
import { prisma } from "@/server/db/prisma";

function normalizeDueAt(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function versionSnapshot(input: {
  number?: string | null;
  type: Prisma.DocumentCreateInput["type"];
  status: DocumentStatus;
  customerData: Prisma.InputJsonValue;
  serviceData?: Prisma.InputJsonValue | null;
  addressData?: Prisma.InputJsonValue | null;
  vatConfig?: Prisma.InputJsonValue | null;
  subtotalCents: number;
  taxCents: number;
  grossCents: number;
  paymentDetails?: Prisma.InputJsonValue | null;
  dueAt?: Date | null;
  visibleNotes?: string | null;
  internalNotes?: string | null;
  legalBlocks?: Prisma.InputJsonValue | null;
  includeAgbAppendix: boolean;
  lineItems: Prisma.InputJsonValue;
}) {
  return {
    number: input.number ?? null,
    type: input.type,
    status: input.status,
    customerData: input.customerData,
    serviceData: input.serviceData ?? null,
    addressData: input.addressData ?? null,
    vatConfig: input.vatConfig ?? null,
    subtotalCents: input.subtotalCents,
    taxCents: input.taxCents,
    grossCents: input.grossCents,
    paymentDetails: input.paymentDetails ?? null,
    dueAt: input.dueAt?.toISOString() ?? null,
    visibleNotes: input.visibleNotes ?? null,
    internalNotes: input.internalNotes ?? null,
    legalBlocks: input.legalBlocks ?? null,
    includeAgbAppendix: input.includeAgbAppendix,
    lineItems: input.lineItems,
  };
}

export async function createDocumentDraft(
  payload: unknown,
  createdByUserId?: string | null,
) {
  const parsed = documentPayloadSchema.parse(payload);
  const totals = calculateTotals(parsed.lineItems);

  return await prisma.$transaction(async (tx) => {
    const number = await generateDocumentNumber(parsed.type, tx);
    const document = await tx.document.create({
      data: {
        type: parsed.type,
        number,
        status: parsed.status ?? "DRAFT",
        orderId: parsed.orderId ?? null,
        customerData: parsed.customerData,
        serviceData: parsed.serviceData as Prisma.InputJsonValue | undefined,
        addressData: parsed.addressData as Prisma.InputJsonValue | undefined,
        vatConfig: parsed.vatConfig as Prisma.InputJsonValue | undefined,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        grossCents: totals.grossCents,
        paymentDetails: parsed.paymentDetails as Prisma.InputJsonValue | undefined,
        dueAt: normalizeDueAt(parsed.dueAt),
        visibleNotes: parsed.visibleNotes ?? null,
        internalNotes: parsed.internalNotes ?? null,
        legalBlocks: parsed.legalBlocks as Prisma.InputJsonValue | undefined,
        includeAgbAppendix: parsed.includeAgbAppendix ?? false,
        lineItems: {
          create: parsed.lineItems.map((item) => ({
            position: item.position,
            title: item.title,
            description: item.description ?? null,
            quantity: item.quantity,
            unit: item.unit,
            unitPriceNetCents: item.unitPriceNetCents,
            vatRate: item.vatRate,
            totalNetCents: item.totalNetCents,
            totalGrossCents: item.totalGrossCents,
          })),
        },
      },
    });

    const snapshot = versionSnapshot({
      number,
      type: parsed.type,
      status: parsed.status ?? "DRAFT",
      customerData: parsed.customerData,
      serviceData: parsed.serviceData as Prisma.InputJsonValue | null | undefined,
      addressData: parsed.addressData as Prisma.InputJsonValue | null | undefined,
      vatConfig: parsed.vatConfig as Prisma.InputJsonValue | null | undefined,
      subtotalCents: totals.subtotalCents,
      taxCents: totals.taxCents,
      grossCents: totals.grossCents,
      paymentDetails: parsed.paymentDetails as Prisma.InputJsonValue | null | undefined,
      dueAt: normalizeDueAt(parsed.dueAt),
      visibleNotes: parsed.visibleNotes,
      internalNotes: parsed.internalNotes,
      legalBlocks: parsed.legalBlocks as Prisma.InputJsonValue | null | undefined,
      includeAgbAppendix: parsed.includeAgbAppendix ?? false,
      lineItems: parsed.lineItems as Prisma.InputJsonValue,
    });

    const version = await tx.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: 1,
        dataSnapshot: snapshot,
        hash: createDocumentHash(snapshot),
        status: document.status,
        createdByUserId: createdByUserId ?? null,
      },
    });

    const updated = await tx.document.update({
      where: { id: document.id },
      data: { currentVersionId: version.id },
      include: {
        lineItems: true,
        currentVersion: true,
      },
    });

    await writeDocumentAuditLog({
      actorUserId: createdByUserId ?? undefined,
      action: "document.created",
      entityId: updated.id,
      after: { id: updated.id, number: updated.number, type: updated.type, status: updated.status },
    });

    return updated;
  });
}

export async function reviseDocumentDraft(input: {
  documentId: string;
  payload: unknown;
  actorUserId?: string | null;
}) {
  const parsed = documentPayloadSchema.parse(input.payload);
  const totals = calculateTotals(parsed.lineItems);

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.document.findUnique({
      where: { id: input.documentId },
      include: {
        currentVersion: true,
      },
    });

    if (!existing) {
      throw new Error("Dokument nicht gefunden.");
    }

    const nextVersionNumber = existing.currentVersion ? existing.currentVersion.versionNumber + 1 : 1;
    const nextStatus =
      existing.status === "ADMIN_APPROVED" || existing.status === "SIGNATURE_PENDING"
        ? "DRAFT"
        : parsed.status ?? existing.status;

    await tx.signingToken.updateMany({
      where: {
        documentId: existing.id,
        status: "ACTIVE",
      },
      data: {
        status: "SUPERSEDED",
      },
    });

    await tx.document.update({
      where: { id: existing.id },
      data: {
        type: parsed.type,
        status: nextStatus,
        customerData: parsed.customerData,
          serviceData: parsed.serviceData as Prisma.InputJsonValue | undefined,
          addressData: parsed.addressData as Prisma.InputJsonValue | undefined,
          vatConfig: parsed.vatConfig as Prisma.InputJsonValue | undefined,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        grossCents: totals.grossCents,
          paymentDetails: parsed.paymentDetails as Prisma.InputJsonValue | undefined,
        dueAt: normalizeDueAt(parsed.dueAt),
        visibleNotes: parsed.visibleNotes ?? null,
        internalNotes: parsed.internalNotes ?? null,
        legalBlocks: parsed.legalBlocks as Prisma.InputJsonValue | undefined,
        includeAgbAppendix: parsed.includeAgbAppendix ?? false,
        approvedAt: null,
        approvedByUserId: null,
        customerSignatureEnabled: false,
        lineItems: {
          deleteMany: {},
          create: parsed.lineItems.map((item) => ({
            position: item.position,
            title: item.title,
            description: item.description ?? null,
            quantity: item.quantity,
            unit: item.unit,
            unitPriceNetCents: item.unitPriceNetCents,
            vatRate: item.vatRate,
            totalNetCents: item.totalNetCents,
            totalGrossCents: item.totalGrossCents,
          })),
        },
      },
    });

    if (existing.currentVersionId) {
      await tx.documentVersion.update({
        where: { id: existing.currentVersionId },
        data: {
          status: "SUPERSEDED",
        },
      });
    }

    const snapshot = versionSnapshot({
      number: existing.number,
      type: parsed.type,
      status: nextStatus,
      customerData: parsed.customerData,
      serviceData: parsed.serviceData as Prisma.InputJsonValue | null | undefined,
      addressData: parsed.addressData as Prisma.InputJsonValue | null | undefined,
      vatConfig: parsed.vatConfig as Prisma.InputJsonValue | null | undefined,
      subtotalCents: totals.subtotalCents,
      taxCents: totals.taxCents,
      grossCents: totals.grossCents,
      paymentDetails: parsed.paymentDetails as Prisma.InputJsonValue | null | undefined,
      dueAt: normalizeDueAt(parsed.dueAt),
      visibleNotes: parsed.visibleNotes,
      internalNotes: parsed.internalNotes,
      legalBlocks: parsed.legalBlocks as Prisma.InputJsonValue | null | undefined,
      includeAgbAppendix: parsed.includeAgbAppendix ?? false,
      lineItems: parsed.lineItems as Prisma.InputJsonValue,
    });

    const version = await tx.documentVersion.create({
      data: {
        documentId: existing.id,
        versionNumber: nextVersionNumber,
        dataSnapshot: snapshot,
        hash: createDocumentHash(snapshot),
        status: nextStatus,
        createdByUserId: input.actorUserId ?? null,
      },
    });

    const updated = await tx.document.update({
      where: { id: existing.id },
      data: {
        currentVersionId: version.id,
      },
      include: {
        lineItems: true,
        currentVersion: true,
      },
    });

    await writeDocumentAuditLog({
      actorUserId: input.actorUserId ?? undefined,
      action: "document.revised",
      entityId: updated.id,
      before: { status: existing.status, currentVersionId: existing.currentVersionId },
      after: { status: updated.status, currentVersionId: updated.currentVersionId },
    });

    return updated;
  });
}

export async function approveDocumentForSignature(input: {
  documentId: string;
  approvedByUserId: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const document = await tx.document.findUnique({
      where: { id: input.documentId },
      include: {
        currentVersion: true,
      },
    });

    if (!document || !document.currentVersion) {
      throw new Error("Dokument oder Version nicht gefunden.");
    }

    const tokenPayload = issueSigningToken();
    const documentHash = document.currentVersion.hash;

    await tx.documentVersion.update({
      where: { id: document.currentVersion.id },
      data: {
        status: "ADMIN_APPROVED",
      },
    });

    const updated = await tx.document.update({
      where: { id: document.id },
      data: {
        status: "SIGNATURE_PENDING",
        approvedAt: new Date(),
        approvedByUserId: input.approvedByUserId,
        customerSignatureEnabled: true,
      },
      include: {
        currentVersion: true,
      },
    });

    await tx.signingToken.updateMany({
      where: {
        documentId: document.id,
        status: "ACTIVE",
      },
      data: {
        status: "SUPERSEDED",
      },
    });

    const signingToken = await tx.signingToken.create({
      data: {
        documentId: document.id,
        documentVersionId: document.currentVersion.id,
        tokenHash: tokenPayload.tokenHash,
        expiresAt: tokenPayload.expiresAt,
        documentHash,
        status: "ACTIVE",
      },
    });

    await writeDocumentAuditLog({
      actorUserId: input.approvedByUserId,
      action: "document.approved_for_signature",
      entityId: updated.id,
      after: {
        id: updated.id,
        approvedAt: updated.approvedAt?.toISOString() ?? null,
        currentVersionId: updated.currentVersionId,
        signingTokenId: signingToken.id,
      },
    });

    return {
      document: updated,
      token: tokenPayload.token,
      tokenHash: tokenPayload.tokenHash,
      expiresAt: tokenPayload.expiresAt,
      documentHash,
    };
  });
}

export async function revokeDocumentSignatureApproval(input: {
  documentId: string;
  actorUserId?: string | null;
}) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.document.findUnique({
      where: { id: input.documentId },
    });

    if (!existing) {
      throw new Error("Dokument nicht gefunden.");
    }

    await tx.signingToken.updateMany({
      where: {
        documentId: existing.id,
        status: "ACTIVE",
      },
      data: {
        status: "REVOKED",
      },
    });

    const updated = await tx.document.update({
      where: { id: existing.id },
      data: {
        status: "DRAFT",
        approvedAt: null,
        approvedByUserId: null,
        customerSignatureEnabled: false,
      },
    });

    await writeDocumentAuditLog({
      actorUserId: input.actorUserId ?? undefined,
      action: "document.signature_revoked",
      entityId: updated.id,
      before: { status: existing.status },
      after: { status: updated.status },
    });

    return updated;
  });
}
