import type {
  DocumentStatus,
  DocumentType,
  RequestWorkflowStatus,
  SigningTokenStatus,
} from "../../../prisma/generated/prisma/client";

export type MoneyCents = number;

export type DocumentLineItemInput = {
  position: number;
  title: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unitPriceNetCents: MoneyCents;
  vatRate: number;
  totalNetCents: MoneyCents;
  totalGrossCents: MoneyCents;
};

export type PartySnapshot = {
  name: string;
  email?: string | null;
  phone?: string | null;
  billingAddress?: string | null;
};

export type ServiceSnapshot = {
  serviceType?: string | null;
  serviceDate?: string | null;
  requestedWindow?: string | null;
  items?: unknown;
  estimateSource?: string | null;
  estimateMinCents?: number | null;
  estimateMaxCents?: number | null;
};

export type AddressSnapshot = {
  fromAddress?: string | null;
  toAddress?: string | null;
  pickupAddress?: string | null;
};

export type DocumentPayload = {
  type: DocumentType;
  status?: DocumentStatus;
  orderId?: string | null;
  customerData: PartySnapshot;
  serviceData?: ServiceSnapshot | null;
  addressData?: AddressSnapshot | null;
  vatConfig?: { defaultVatRate?: number | null } | null;
  paymentDetails?: {
    iban?: string | null;
    bic?: string | null;
    paymentDueDays?: number | null;
  } | null;
  dueAt?: string | Date | null;
  visibleNotes?: string | null;
  internalNotes?: string | null;
  legalBlocks?: unknown;
  includeAgbAppendix?: boolean;
  lineItems: DocumentLineItemInput[];
};

export type DocumentVersionSnapshot = {
  number?: string | null;
  type: DocumentType;
  status: DocumentStatus;
  customerData: PartySnapshot;
  serviceData?: ServiceSnapshot | null;
  addressData?: AddressSnapshot | null;
  vatConfig?: { defaultVatRate?: number | null } | null;
  subtotalCents: number;
  taxCents: number;
  grossCents: number;
  paymentDetails?: DocumentPayload["paymentDetails"];
  dueAt?: string | null;
  visibleNotes?: string | null;
  internalNotes?: string | null;
  legalBlocks?: unknown;
  includeAgbAppendix: boolean;
  lineItems: DocumentLineItemInput[];
};

export type ApprovalResult = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
  documentHash: string;
  status: SigningTokenStatus;
};

export type WorkflowState = RequestWorkflowStatus;
