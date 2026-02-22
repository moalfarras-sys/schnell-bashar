import "dotenv/config";

import { prisma } from "../src/server/db/prisma";
import {
  deriveContractNoFromOrderNo,
  deriveOfferNoFromOrderNo,
  nextDocumentNumber,
  orderDisplayNo,
} from "../src/server/ids/document-number";

type Stats = {
  ordersUpdated: number;
  offersUpdated: number;
  contractsUpdated: number;
  skipped: number;
  conflicts: number;
};

function isUniqueConflict(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

async function backfillOrders(stats: Stats) {
  const orders = await prisma.order.findMany({
    where: { orderNo: null },
    select: { id: true, publicId: true },
    orderBy: { createdAt: "asc" },
  });

  for (const order of orders) {
    const targetNo = order.publicId.startsWith("AUF-")
      ? order.publicId
      : await nextDocumentNumber("ORDER");

    try {
      await prisma.order.update({
        where: { id: order.id },
        data: { orderNo: targetNo },
      });
      stats.ordersUpdated += 1;
    } catch (error) {
      if (isUniqueConflict(error)) {
        stats.conflicts += 1;
        continue;
      }
      throw error;
    }
  }
}

async function backfillOffers(stats: Stats) {
  const offers = await prisma.offer.findMany({
    where: { offerNo: null },
    select: {
      id: true,
      order: {
        select: {
          publicId: true,
          orderNo: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const offer of offers) {
    const orderNo = offer.order ? orderDisplayNo(offer.order) : null;
    if (!orderNo) {
      stats.skipped += 1;
      continue;
    }

    const targetNo = deriveOfferNoFromOrderNo(orderNo);
    try {
      await prisma.offer.update({
        where: { id: offer.id },
        data: { offerNo: targetNo },
      });
      stats.offersUpdated += 1;
    } catch (error) {
      if (isUniqueConflict(error)) {
        stats.conflicts += 1;
        continue;
      }
      throw error;
    }
  }
}

async function backfillContracts(stats: Stats) {
  const contracts = await prisma.contract.findMany({
    where: { contractNo: null },
    select: {
      id: true,
      offer: {
        select: {
          order: {
            select: {
              publicId: true,
              orderNo: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const contract of contracts) {
    const orderNo = contract.offer.order ? orderDisplayNo(contract.offer.order) : null;
    if (!orderNo) {
      stats.skipped += 1;
      continue;
    }

    const targetNo = deriveContractNoFromOrderNo(orderNo);
    try {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { contractNo: targetNo },
      });
      stats.contractsUpdated += 1;
    } catch (error) {
      if (isUniqueConflict(error)) {
        stats.conflicts += 1;
        continue;
      }
      throw error;
    }
  }
}

async function main() {
  const stats: Stats = {
    ordersUpdated: 0,
    offersUpdated: 0,
    contractsUpdated: 0,
    skipped: 0,
    conflicts: 0,
  };

  await backfillOrders(stats);
  await backfillOffers(stats);
  await backfillContracts(stats);

  console.log("[backfill-document-numbers] done");
  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch((error) => {
    console.error("[backfill-document-numbers] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
