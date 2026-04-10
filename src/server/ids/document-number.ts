import { formatInTimeZone } from "date-fns-tz";
import { randomUUID } from "node:crypto";

import { prisma } from "@/server/db/prisma";

type Scope = "ORDER" | "OFFER" | "CONTRACT" | "INVOICE";

const PREFIX: Record<Scope, string> = {
  ORDER: "AUF",
  OFFER: "ANG",
  CONTRACT: "VER",
  INVOICE: "RE",
};
const ORDER_PREFIX = `${PREFIX.ORDER}-`;

function dailyBucketBerlin(date: Date): string {
  return formatInTimeZone(date, "Europe/Berlin", "yyyyMMdd");
}

function formatDocumentNo(scope: Scope, bucket: string, counter: number): string {
  const seq = String(counter).padStart(2, "0");
  return `${PREFIX[scope]}-${bucket}-${seq}`;
}

export function formatManualDocumentNo(scope: Scope, suffix: string, now = new Date()): string {
  const normalized = suffix.trim();
  if (!/^\d{3}$/.test(normalized)) {
    throw new Error("Manual document suffix must be exactly 3 digits");
  }
  const bucket = dailyBucketBerlin(now);
  return `${PREFIX[scope]}-${bucket}-${normalized}`;
}

export async function nextDocumentNumber(scope: Scope, now = new Date()): Promise<string> {
  const bucket = dailyBucketBerlin(now);

  const rows = await prisma.$transaction(async (tx) =>
    tx.$queryRawUnsafe<Array<{ counter: number | string | bigint }>>(
      `
      INSERT INTO "DocumentSequence" ("id", "scope", "timeBucket", "counter", "createdAt", "updatedAt")
      VALUES ($1, $2::"DocumentScope", $3, 1, NOW(), NOW())
      ON CONFLICT ("scope", "timeBucket")
      DO UPDATE SET
        "counter" = "DocumentSequence"."counter" + 1,
        "updatedAt" = NOW()
      RETURNING "counter"
      `,
      randomUUID(),
      scope,
      bucket,
    ),
  );

  const counterValue = rows[0]?.counter;
  const counter = Number(counterValue);
  if (!Number.isFinite(counter) || counter < 1) {
    throw new Error(`Invalid sequence counter for ${scope}/${bucket}`);
  }

  return formatDocumentNo(scope, bucket, counter);
}

function suffixFromOrderNo(orderNo: string): string {
  const trimmed = orderNo.trim();
  if (!trimmed) {
    throw new Error("orderNo is required to derive a document number");
  }

  if (trimmed.startsWith(ORDER_PREFIX)) {
    return trimmed.slice(ORDER_PREFIX.length);
  }

  // Legacy/unknown order ids: strip first token prefix once and reuse rest.
  const normalized = trimmed.replace(/^[A-Z]+-/, "");
  if (!normalized) {
    throw new Error(`Cannot derive document suffix from orderNo: ${orderNo}`);
  }
  return normalized;
}

export function deriveOfferNoFromOrderNo(orderNo: string): string {
  return `${PREFIX.OFFER}-${suffixFromOrderNo(orderNo)}`;
}

export function deriveContractNoFromOrderNo(orderNo: string): string {
  return `${PREFIX.CONTRACT}-${suffixFromOrderNo(orderNo)}`;
}

export function deriveInvoiceNoFromOrderNo(orderNo: string): string {
  return `${PREFIX.INVOICE}-${suffixFromOrderNo(orderNo)}`;
}

export function contractDisplayNo(contract: {
  contractNo?: string | null;
  id: string;
  orderNo?: string | null;
  orderPublicId?: string | null;
}): string {
  if (contract.contractNo) return contract.contractNo;
  const orderRef = contract.orderNo || contract.orderPublicId;
  if (orderRef) {
    return deriveContractNoFromOrderNo(orderRef);
  }
  return contract.id;
}

export function offerDisplayNo(offer: {
  offerNo?: string | null;
  id: string;
  orderNo?: string | null;
  orderPublicId?: string | null;
}): string {
  if (offer.offerNo) return offer.offerNo;
  const orderRef = offer.orderNo || offer.orderPublicId;
  if (orderRef) {
    return deriveOfferNoFromOrderNo(orderRef);
  }
  return offer.id;
}

export function orderDisplayNo(order: { orderNo?: string | null; publicId: string }): string {
  return order.orderNo || order.publicId;
}
