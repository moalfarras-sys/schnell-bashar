import { z } from "zod";

export const documentLineItemSchema = z.object({
  position: z.number().int().nonnegative(),
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1),
  unitPriceNetCents: z.number().int(),
  vatRate: z.number().min(0).max(100),
  totalNetCents: z.number().int(),
  totalGrossCents: z.number().int(),
});

export const documentPayloadSchema = z.object({
  type: z.enum(["ANGEBOT", "RECHNUNG", "AUFTRAG_VERTRAG", "MAHNUNG", "AGB_APPENDIX"]),
  status: z
    .enum([
      "DRAFT",
      "INTERNAL_REVIEW",
      "ADMIN_APPROVED",
      "SENT",
      "VIEWED",
      "ACCEPTED",
      "SIGNATURE_PENDING",
      "SIGNED",
      "VOID",
      "CANCELLED",
      "SUPERSEDED",
    ])
    .optional(),
  orderId: z.string().cuid().nullable().optional(),
  customerData: z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().email().nullable().optional(),
    phone: z.string().trim().nullable().optional(),
    billingAddress: z.string().trim().nullable().optional(),
  }),
  serviceData: z
    .object({
      serviceType: z.string().trim().nullable().optional(),
      serviceDate: z.string().trim().nullable().optional(),
      requestedWindow: z.string().trim().nullable().optional(),
      items: z.unknown().optional(),
      estimateSource: z.string().trim().nullable().optional(),
      estimateMinCents: z.number().int().nullable().optional(),
      estimateMaxCents: z.number().int().nullable().optional(),
    })
    .nullable()
    .optional(),
  addressData: z
    .object({
      fromAddress: z.string().trim().nullable().optional(),
      toAddress: z.string().trim().nullable().optional(),
      pickupAddress: z.string().trim().nullable().optional(),
    })
    .nullable()
    .optional(),
  vatConfig: z.object({ defaultVatRate: z.number().min(0).max(100).nullable().optional() }).nullable().optional(),
  paymentDetails: z
    .object({
      iban: z.string().trim().nullable().optional(),
      bic: z.string().trim().nullable().optional(),
      paymentDueDays: z.number().int().positive().nullable().optional(),
    })
    .nullable()
    .optional(),
  dueAt: z.union([z.string(), z.date()]).nullable().optional(),
  visibleNotes: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
  legalBlocks: z.unknown().optional(),
  includeAgbAppendix: z.boolean().optional(),
  lineItems: z.array(documentLineItemSchema).min(1),
});

export const documentVersionSnapshotSchema = z.object({
  number: z.string().trim().nullable().optional(),
  type: z.enum(["ANGEBOT", "RECHNUNG", "AUFTRAG_VERTRAG", "MAHNUNG", "AGB_APPENDIX"]),
  status: z.enum([
    "DRAFT",
    "INTERNAL_REVIEW",
    "ADMIN_APPROVED",
    "SENT",
    "VIEWED",
    "ACCEPTED",
    "SIGNATURE_PENDING",
    "SIGNED",
    "VOID",
    "CANCELLED",
    "SUPERSEDED",
  ]),
  customerData: z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().email().nullable().optional(),
    phone: z.string().trim().nullable().optional(),
    billingAddress: z.string().trim().nullable().optional(),
  }),
  serviceData: z
    .object({
      serviceType: z.string().trim().nullable().optional(),
      serviceDate: z.string().trim().nullable().optional(),
      requestedWindow: z.string().trim().nullable().optional(),
      items: z.unknown().optional(),
      estimateSource: z.string().trim().nullable().optional(),
      estimateMinCents: z.number().int().nullable().optional(),
      estimateMaxCents: z.number().int().nullable().optional(),
    })
    .nullable()
    .optional(),
  addressData: z
    .object({
      fromAddress: z.string().trim().nullable().optional(),
      toAddress: z.string().trim().nullable().optional(),
      pickupAddress: z.string().trim().nullable().optional(),
    })
    .nullable()
    .optional(),
  vatConfig: z.object({ defaultVatRate: z.number().min(0).max(100).nullable().optional() }).nullable().optional(),
  subtotalCents: z.number().int(),
  taxCents: z.number().int(),
  grossCents: z.number().int(),
  paymentDetails: z
    .object({
      iban: z.string().trim().nullable().optional(),
      bic: z.string().trim().nullable().optional(),
      paymentDueDays: z.number().int().positive().nullable().optional(),
    })
    .nullable()
    .optional(),
  dueAt: z.string().trim().nullable().optional(),
  visibleNotes: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
  legalBlocks: z.unknown().optional(),
  includeAgbAppendix: z.boolean(),
  lineItems: z.array(documentLineItemSchema).min(1),
});

export const approvalPayloadSchema = z.object({
  documentId: z.string().cuid(),
  approvedByUserId: z.string().cuid(),
  expiresAt: z.date().optional(),
});

export const signDocumentSchema = z.object({
  signerName: z.string().trim().min(2),
  signerEmail: z.string().trim().email().nullable().optional(),
  consentAccepted: z.literal(true),
});
