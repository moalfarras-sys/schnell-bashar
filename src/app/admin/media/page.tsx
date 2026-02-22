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
  }> = [];

  try {
    assets = await delegates.mediaAsset.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 200,
    }) as typeof assets;
  } catch {}

  return <MediaLibraryClient initialAssets={assets} />;
}
