import { prisma } from "@/server/db/prisma";
import { createInvoiceFromContract } from "@/server/accounting/create-invoice-from-contract";

async function main() {
  const contracts = await prisma.contract.findMany({
    where: {
      status: "SIGNED",
      deletedAt: null,
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;
  let skipped = 0;

  for (const c of contracts) {
    const existing = await prisma.invoice.findFirst({ where: { contractId: c.id } });
    if (existing) {
      skipped++;
      continue;
    }
    const inv = await createInvoiceFromContract(c.id);
    if (inv) created++;
  }

  console.log(`[invoice-backfill] done. created=${created} skipped=${skipped} total=${contracts.length}`);
}

main()
  .catch((err) => {
    console.error("[invoice-backfill] failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

