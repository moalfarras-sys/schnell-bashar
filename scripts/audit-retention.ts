import { subMonths } from "date-fns";
import { prisma } from "@/server/db/prisma";

async function main() {
  const cutoff = subMonths(new Date(), 36);
  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  console.log(`[audit-retention] deleted=${result.count} cutoff=${cutoff.toISOString()}`);
}

main()
  .catch((err) => {
    console.error("[audit-retention] failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
