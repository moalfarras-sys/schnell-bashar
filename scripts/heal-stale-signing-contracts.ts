import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/prisma/client";
import {
  buildFallbackSigningUrl,
  getFallbackSigningExpiry,
  issueFallbackSigningToken,
} from "../src/server/signing/fallback-signing";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/schnell_sicher_umzug?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const staleContracts = await prisma.contract.findMany({
    where: {
      status: "PENDING_SIGNATURE",
      signatureProvider: "DOCUSIGN",
      signingUrl: null,
      docusignStatus: "not_configured",
    },
    select: {
      id: true,
      sentForSigningAt: true,
      offer: {
        select: {
          id: true,
          token: true,
          customerName: true,
          customerEmail: true,
        },
      },
    },
  });

  if (staleContracts.length === 0) {
    console.log("No stale contracts found.");
    return;
  }

  console.log(`Healing ${staleContracts.length} stale contracts...`);

  for (const contract of staleContracts) {
    const tokenPayload = issueFallbackSigningToken();
    const signingUrl = buildFallbackSigningUrl(tokenPayload.token, contract.offer.token);

    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        signatureProvider: "INTERNAL",
        docusignStatus: "internal_pending",
        signingUrl,
        signatureTokenHash: tokenPayload.tokenHash,
        signatureTokenExpiresAt: getFallbackSigningExpiry(),
        sentForSigningAt: contract.sentForSigningAt ?? new Date(),
      },
    });

    console.log(
      `Healed contract=${contract.id} offer=${contract.offer.id} customer=${contract.offer.customerEmail}`,
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
