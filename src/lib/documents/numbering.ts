import type { DocumentType, Prisma } from "../../../prisma/generated/prisma/client";

import { DOCUMENT_PREFIXES } from "@/lib/documents/constants";
import { prisma } from "@/server/db/prisma";

function currentYear(now = new Date()) {
  return now.getFullYear();
}

function formatCounter(counter: number) {
  return String(counter).padStart(4, "0");
}

export async function generateDocumentNumber(
  type: DocumentType,
  tx?: Prisma.TransactionClient,
  now = new Date(),
) {
  const client = tx ?? prisma;
  const year = currentYear(now);
  const prefix = DOCUMENT_PREFIXES[type];

  const sequence = await client.documentNumberSequence.upsert({
    where: {
      type_year: {
        type,
        year,
      },
    },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
    create: {
      type,
      year,
      prefix,
      lastNumber: 1,
    },
  });

  return `${prefix}-${year}-${formatCounter(sequence.lastNumber)}`;
}
