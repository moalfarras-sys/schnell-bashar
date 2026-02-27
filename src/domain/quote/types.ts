import type { z } from "zod";
import type {
  QuoteAddressSchema,
  QuoteDraftSchema,
  QuoteResultSchema,
  QuoteServiceContextSchema,
  QuoteStatusSchema,
} from "@/domain/quote/schema";

export type QuoteServiceContext = z.infer<typeof QuoteServiceContextSchema>;
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>;
export type QuoteAddress = z.infer<typeof QuoteAddressSchema>;
export type QuoteDraft = z.infer<typeof QuoteDraftSchema>;
export type QuoteResult = z.infer<typeof QuoteResultSchema>;

export type QuoteSnapshot = {
  quoteId: string;
  status: QuoteStatus;
  source: "PREISE";
  serviceContext: QuoteServiceContext;
  packageSpeed: QuoteDraft["packageSpeed"];
  draft: QuoteDraft;
  result: QuoteResult;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  orderPublicId?: string | null;
};

export type QuotePipelineStatus =
  | "QUOTE"
  | "PENDING_SIGNATURE"
  | "CONFIRMED"
  | "SCHEDULED"
  | "CANCELLED"
  | "EXPIRED";
