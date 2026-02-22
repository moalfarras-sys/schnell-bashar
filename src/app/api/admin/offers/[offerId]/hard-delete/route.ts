import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";
import { requireAdminSession } from "@/server/auth/require-admin";
import { hardDeleteAssetTargets } from "@/server/storage/hard-delete-assets";

export const runtime = "nodejs";

type Payload = {
  confirmText?: string;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ offerId: string }> },
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Payload;
  if (body.confirmText !== "DELETE") {
    return NextResponse.json({ error: "Invalid confirmation" }, { status: 400 });
  }

  const { offerId } = await params;
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      contract: {
        select: {
          contractPdfUrl: true,
          signedPdfUrl: true,
          auditTrailUrl: true,
        },
      },
    },
  });
  if (!offer) return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });

  const assetTargets: string[] = [
    offer.pdfUrl ?? "",
    offer.contract?.contractPdfUrl ?? "",
    offer.contract?.signedPdfUrl ?? "",
    offer.contract?.auditTrailUrl ?? "",
  ].filter((x) => x.length > 0);

  const cleanup = await hardDeleteAssetTargets(assetTargets);

  await prisma.offer.delete({ where: { id: offerId } });
  revalidatePath("/admin/offers");

  const payload = {
    success: true,
    deleted: {
      offer: 1,
      assetsDeleted: cleanup.deletedCount,
    },
    warnings: cleanup.warnings,
  };

  if (cleanup.warnings.length > 0) {
    return NextResponse.json(payload, { status: 409 });
  }
  return NextResponse.json(payload);
}

