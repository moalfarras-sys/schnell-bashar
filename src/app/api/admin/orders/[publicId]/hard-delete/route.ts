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
  { params }: { params: Promise<{ publicId: string }> },
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Payload;
  if (body.confirmText !== "DELETE") {
    return NextResponse.json({ error: "Invalid confirmation" }, { status: 400 });
  }

  const { publicId } = await params;
  const order = await prisma.order.findUnique({
    where: { publicId },
    include: {
      uploads: { select: { filePath: true } },
      offer: {
        include: {
          contract: {
            select: {
              contractPdfUrl: true,
              signedPdfUrl: true,
              auditTrailUrl: true,
            },
          },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Auftrag nicht gefunden" }, { status: 404 });

  const assetTargets: string[] = [
    ...order.uploads.map((u) => u.filePath),
    order.offer?.pdfUrl ?? "",
    order.offer?.contract?.contractPdfUrl ?? "",
    order.offer?.contract?.signedPdfUrl ?? "",
    order.offer?.contract?.auditTrailUrl ?? "",
  ].filter((x) => x.length > 0);

  const cleanup = await hardDeleteAssetTargets(assetTargets);

  await prisma.order.delete({ where: { publicId } });
  revalidatePath("/admin/orders");

  const payload = {
    success: true,
    deleted: {
      order: 1,
      assetsDeleted: cleanup.deletedCount,
    },
    warnings: cleanup.warnings,
  };

  if (cleanup.warnings.length > 0) {
    return NextResponse.json(payload, { status: 409 });
  }
  return NextResponse.json(payload);
}

