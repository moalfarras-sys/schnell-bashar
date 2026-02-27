import { addDays } from "date-fns";
import { nanoid } from "nanoid";

import type { Prisma } from "../../../prisma/generated/prisma/client";
import type { QuoteDraft, QuotePipelineStatus, QuoteSnapshot } from "@/domain/quote/types";
import { calculateQuote } from "@/server/quotes/calculate-quote";
import { prisma } from "@/server/db/prisma";

function toDbServiceContext(context: QuoteDraft["serviceContext"]) {
  if (context === "SPEZIALSERVICE") return "SPEZIALSERVICE";
  return context;
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (typeof value === "undefined") return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

type QuoteDraftPatch = Omit<Partial<QuoteDraft>, "extras"> & {
  extras?: Partial<QuoteDraft["extras"]>;
};

function toQuoteSnapshot(record: {
  quoteId: string;
  status: string;
  source: string;
  serviceContext: string;
  packageSpeed: "ECONOMY" | "STANDARD" | "EXPRESS";
  draftJson: unknown;
  resultJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  order?: { publicId: string } | null;
}): QuoteSnapshot {
  return {
    quoteId: record.quoteId,
    status: record.status as QuotePipelineStatus,
    source: record.source as "PREISE",
    serviceContext: record.serviceContext as QuoteDraft["serviceContext"],
    packageSpeed: record.packageSpeed,
    draft: record.draftJson as QuoteDraft,
    result: record.resultJson as QuoteSnapshot["result"],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
    orderPublicId: record.order?.publicId ?? null,
  };
}

export async function createQuote(input: QuoteDraft): Promise<QuoteSnapshot> {
  const calculated = await calculateQuote(input, { allowDistanceFallback: true });
  const quoteId = `q_${nanoid(24)}`;
  const expiresAt = addDays(new Date(), 14);

  const quote = await prisma.quote.create({
    data: {
      quoteId,
      status: "QUOTE",
      source: "PREISE",
      serviceContext: toDbServiceContext(calculated.draft.serviceContext),
      packageSpeed: calculated.draft.packageSpeed,
      draftJson: calculated.draft,
      resultJson: calculated.result,
      distanceKm: calculated.result.distanceKm ?? null,
      driveCostCents: calculated.result.driveCostCents,
      subtotalCents: calculated.result.subtotalCents,
      priceMinCents: calculated.result.priceMinCents,
      priceMaxCents: calculated.result.priceMaxCents,
      expiresAt,
      events: {
        create: {
          eventType: "quote_created",
          payloadJson: toInputJsonValue({
            source: "preise",
            context: calculated.draft.serviceContext,
          }),
        },
      },
    },
    include: { order: { select: { publicId: true } } },
  });

  return toQuoteSnapshot(quote);
}

export async function getQuoteByPublicId(quoteId: string): Promise<QuoteSnapshot | null> {
  const quote = await prisma.quote.findUnique({
    where: { quoteId },
    include: { order: { select: { publicId: true } } },
  });
  if (!quote) return null;
  return toQuoteSnapshot(quote);
}

export async function updateQuote(
  quoteId: string,
  patch: QuoteDraftPatch,
): Promise<QuoteSnapshot | null> {
  const existing = await prisma.quote.findUnique({ where: { quoteId } });
  if (!existing) return null;
  if (existing.expiresAt < new Date()) {
    await prisma.quote.update({
      where: { quoteId },
      data: { status: "EXPIRED" },
    });
    return null;
  }

  const nextDraft = {
    ...(existing.draftJson as QuoteDraft),
    ...patch,
    extras: {
      ...((existing.draftJson as QuoteDraft).extras ?? {}),
      ...(patch.extras ?? {}),
    },
  } as QuoteDraft;
  const calculated = await calculateQuote(nextDraft, { allowDistanceFallback: true });

  const updated = await prisma.quote.update({
    where: { quoteId },
    data: {
      serviceContext: toDbServiceContext(calculated.draft.serviceContext),
      packageSpeed: calculated.draft.packageSpeed,
      draftJson: calculated.draft,
      resultJson: calculated.result,
      distanceKm: calculated.result.distanceKm ?? null,
      driveCostCents: calculated.result.driveCostCents,
      subtotalCents: calculated.result.subtotalCents,
      priceMinCents: calculated.result.priceMinCents,
      priceMaxCents: calculated.result.priceMaxCents,
      events: {
        create: {
          eventType: "quote_updated",
          payloadJson: toInputJsonValue({
            context: calculated.draft.serviceContext,
          }),
        },
      },
    },
    include: { order: { select: { publicId: true } } },
  });

  return toQuoteSnapshot(updated);
}

export async function markQuoteStatus(
  quoteId: string,
  status: QuotePipelineStatus,
  options?: { orderId?: string | null; eventType?: string; payload?: Record<string, unknown> },
) {
  return prisma.quote.update({
    where: { quoteId },
    data: {
      status,
      orderId: options?.orderId ?? undefined,
      events: options?.eventType
        ? {
            create: {
              eventType: options.eventType,
              payloadJson: toInputJsonValue(options.payload),
            },
          }
        : undefined,
    },
  });
}
