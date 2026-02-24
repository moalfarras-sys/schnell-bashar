import path from "node:path";
import fs from "node:fs/promises";

import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";
import { nextDocumentNumber } from "@/server/ids/document-number";
import { generateContractPDF } from "@/server/pdf/generate-contract";
import { buildFallbackSigningUrl, getFallbackSigningExpiry, issueFallbackSigningToken } from "@/server/signing/fallback-signing";

const manualContractSchema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(6),
  customerAddress: z.string().optional().nullable(),
  moveFrom: z.string().optional().nullable(),
  moveTo: z.string().optional().nullable(),
  moveDate: z.string().datetime().optional().nullable(),
  services: z.array(z.string().min(1)).min(1),
  grossCents: z.number().int().positive(),
  netCents: z.number().int().nonnegative().optional(),
  vatCents: z.number().int().nonnegative().optional(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const parsed = manualContractSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabedaten", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const now = new Date();
  const offerToken = nanoid(32);
  const offerNo = await nextDocumentNumber("OFFER");
  const contractNo = await nextDocumentNumber("CONTRACT");
  const netCents = payload.netCents ?? Math.round(payload.grossCents / 1.19);
  const vatCents = payload.vatCents ?? payload.grossCents - netCents;

  const offer = await prisma.offer.create({
    data: {
      token: offerToken,
      offerNo,
      isManual: true,
      status: "ACCEPTED",
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      customerAddress: payload.customerAddress || null,
      moveFrom: payload.moveFrom || null,
      moveTo: payload.moveTo || null,
      moveDate: payload.moveDate ? new Date(payload.moveDate) : null,
      notes: payload.notes || null,
      services: payload.services.map((name) => ({ name, quantity: 1, unit: "Leistung" })),
      netCents,
      vatCents,
      grossCents: payload.grossCents,
      validUntil: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      acceptedAt: now,
    },
  });

  const tokenPayload = issueFallbackSigningToken();
  const signingUrl = buildFallbackSigningUrl(tokenPayload.token, offer.token);

  const contract = await prisma.contract.create({
    data: {
      offerId: offer.id,
      contractNo,
      isManual: true,
      manualPayload: {
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        customerAddress: payload.customerAddress || null,
        moveFrom: payload.moveFrom || null,
        moveTo: payload.moveTo || null,
        moveDate: payload.moveDate || null,
        services: payload.services,
        notes: payload.notes || null,
      },
      status: "PENDING_SIGNATURE",
      signatureProvider: "INTERNAL",
      docusignStatus: "internal_pending",
      signingUrl,
      signatureTokenHash: tokenPayload.tokenHash,
      signatureTokenExpiresAt: getFallbackSigningExpiry(now),
      sentForSigningAt: now,
    },
  });

  const contractPdfBuffer = await generateContractPDF({
    contractId: contract.id,
    contractNo,
    offerNo,
    orderNo: contractNo,
    contractDate: now,
    customerName: payload.customerName,
    customerAddress: payload.customerAddress || undefined,
    customerPhone: payload.customerPhone,
    customerEmail: payload.customerEmail,
    moveFrom: payload.moveFrom || undefined,
    moveTo: payload.moveTo || undefined,
    moveDate: payload.moveDate ? new Date(payload.moveDate) : undefined,
    notes: payload.notes || undefined,
    services: payload.services.map((name) => ({ name, quantity: 1, unit: "Leistung" })),
    netCents,
    vatCents,
    grossCents: payload.grossCents,
  });

  const localDir = path.join(process.cwd(), "public", "uploads", "contracts");
  await fs.mkdir(localDir, { recursive: true });
  const localName = `contract-${contractNo}-${Date.now()}.pdf`;
  await fs.writeFile(path.join(localDir, localName), contractPdfBuffer);

  const contractPdfUrl = `/uploads/contracts/${localName}`;
  await prisma.contract.update({ where: { id: contract.id }, data: { contractPdfUrl } });

  return NextResponse.json(
    {
      success: true,
      contractId: contract.id,
      offerId: offer.id,
      contractNo,
      offerNo,
      signingUrl,
      contractPdfUrl,
    },
    { status: 201 },
  );
}
