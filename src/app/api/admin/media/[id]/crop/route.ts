import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/server/auth/require-admin";
import { canWriteMediaInCurrentRuntime, readMediaAssetBuffer, storeMediaVariant } from "@/server/media/storage";
import { slotAdminDelegates } from "@/server/content/slot-admin-db";
import { hardDeleteAssetTargets } from "@/server/storage/hard-delete-assets";

export const runtime = "nodejs";

const cropSchema = z.object({
  kind: z.enum(["hero", "gallery", "thumbnail", "custom"]),
  aspect: z.enum(["16:9", "4:3", "1:1", "free"]).default("free"),
  x: z.number().min(0).max(1).default(0),
  y: z.number().min(0).max(1).default(0),
  width: z.number().min(0.05).max(1).default(1),
  height: z.number().min(0.05).max(1).default(1),
  quality: z.number().int().min(55).max(95).default(84),
});

function ratioForPreset(aspect: "16:9" | "4:3" | "1:1" | "free"): number | null {
  if (aspect === "16:9") return 16 / 9;
  if (aspect === "4:3") return 4 / 3;
  if (aspect === "1:1") return 1;
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const delegates = slotAdminDelegates();
  if (!delegates.mediaAsset || !delegates.mediaAssetVariant) {
    return NextResponse.json({ error: "Media DB nicht bereit" }, { status: 503 });
  }
  if (!canWriteMediaInCurrentRuntime()) {
    return NextResponse.json(
      { error: "Supabase Storage ist für Media-Varianten auf Vercel noch nicht konfiguriert" },
      { status: 503 },
    );
  }

  const parsed = cropSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Crop-Daten", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const payload = parsed.data;

  const asset = (await delegates.mediaAsset.findUnique({
    where: { id },
    select: { id: true, path: true, filename: true },
  })) as { id: string; path: string; filename: string } | null;

  if (!asset) {
    return NextResponse.json({ error: "Asset nicht gefunden" }, { status: 404 });
  }

  const originalBuffer = await readMediaAssetBuffer(asset.path);
  const img = sharp(originalBuffer, { failOn: "none" });
  const metadata = await img.metadata();
  const srcW = metadata.width ?? 0;
  const srcH = metadata.height ?? 0;

  if (srcW < 2 || srcH < 2) {
    return NextResponse.json({ error: "Bildmetadaten konnten nicht gelesen werden" }, { status: 400 });
  }

  let cropW = Math.max(1, Math.round(srcW * payload.width));
  let cropH = Math.max(1, Math.round(srcH * payload.height));
  let left = Math.round(srcW * payload.x);
  let top = Math.round(srcH * payload.y);

  const ratio = ratioForPreset(payload.aspect);
  if (ratio) {
    const boxRatio = cropW / Math.max(1, cropH);
    if (boxRatio > ratio) {
      cropW = Math.max(1, Math.round(cropH * ratio));
    } else {
      cropH = Math.max(1, Math.round(cropW / ratio));
    }
  }

  left = Math.min(Math.max(0, left), Math.max(0, srcW - cropW));
  top = Math.min(Math.max(0, top), Math.max(0, srcH - cropH));

  const outputBuffer = await img
    .extract({ left, top, width: cropW, height: cropH })
    .webp({ quality: payload.quality })
    .toBuffer();

  const fileName = `${payload.kind}-${Date.now()}-${asset.id.slice(0, 8)}.webp`;
  const publicPath = await storeMediaVariant({
    assetId: asset.id,
    fileName,
    buffer: outputBuffer,
    contentType: "image/webp",
  });

  if (payload.kind !== "custom") {
    const previousVariants = (await delegates.mediaAssetVariant.findMany({
      where: {
        assetId: asset.id,
        kind: payload.kind,
      },
      select: { path: true },
    })) as Array<{ path: string }>;

    await delegates.mediaAssetVariant.deleteMany({
      where: {
        assetId: asset.id,
        kind: payload.kind,
      },
    });

    await hardDeleteAssetTargets(previousVariants.map((entry) => entry.path));
  }

  const variant = await delegates.mediaAssetVariant.create({
    data: {
      assetId: asset.id,
      kind: payload.kind,
      path: publicPath,
      mimeType: "image/webp",
      sizeBytes: outputBuffer.length,
      width: cropW,
      height: cropH,
    },
  });

  return NextResponse.json({ success: true, variant }, { status: 201 });
}
