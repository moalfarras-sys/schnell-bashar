import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/schnell_sicher_umzug?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const stale = await prisma.contract.findMany({
    where: {
      status: "PENDING_SIGNATURE",
      signatureProvider: "DOCUSIGN",
      signingUrl: null,
      docusignStatus: "not_configured",
    },
    include: {
      offer: {
        select: {
          id: true,
          offerNo: true,
          customerEmail: true,
          customerName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Stale contracts: ${stale.length}`);
  for (const contract of stale) {
    console.log(
      JSON.stringify({
        contractId: contract.id,
        contractNo: contract.contractNo,
        offerId: contract.offer.id,
        offerNo: contract.offer.offerNo,
        customerEmail: contract.offer.customerEmail,
        customerName: contract.offer.customerName,
        createdAt: contract.createdAt.toISOString(),
      }),
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
