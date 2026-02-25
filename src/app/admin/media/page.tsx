import { slotAdminDelegates } from "@/server/content/slot-admin-db";

import { MediaLibraryClient } from "./ui";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const delegates = slotAdminDelegates();
  if (!delegates.mediaAsset) return <MediaLibraryClient initialAssets={[]} />;

  let assets: Array<{
    id: string;
    filename: string;
    path: string;
    alt: string | null;
    title: string | null;
    mime: string;
    size: number;
    width: number | null;
    height: number | null;
    variants: Array<{
      id: string;
      kind: "hero" | "gallery" | "thumbnail" | "custom";
      path: string;
      width: number | null;
      height: number | null;
      mimeType: string;
      sizeBytes: number;
    }>;
  }> = [];

  try {
    assets = await delegates.mediaAsset.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { variants: { orderBy: { createdAt: "desc" } } },
    }) as typeof assets;
  } catch {}

  return <MediaLibraryClient initialAssets={assets} />;
}
