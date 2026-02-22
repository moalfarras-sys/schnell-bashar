import { formatInTimeZone } from "date-fns-tz";
import { randomUUID } from "node:crypto";

import { prisma } from "@/server/db/prisma";

type Scope = "ORDER" | "OFFER" | "CONTRACT";

const PREFIX: Record<Scope, string> = {
  ORDER: "AUF",
  OFFER: "ANG",
  CONTRACT: "VER",
};
const ORDER_PREFIX = `${PREFIX.ORDER}-`;

function minuteBucketBerlin(date: Date): string {
  return formatInTimeZone(date, "Europe/Berlin", "yyyyMMddHHmm");
}

function formatDocumentNo(scope: Scope, bucket: string, counter: number): string {
  const date = bucket.slice(0, 8);
  const hm = bucket.slice(8, 12);
  const seq = String(counter).padStart(3, "0");
  return `${PREFIX[scope]}-${date}-${hm}-${seq}`;
}

export async function nextDocumentNumber(scope: Scope, now = new Date()): Promise<string> {
  const bucket = minuteBucketBerlin(now);

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
