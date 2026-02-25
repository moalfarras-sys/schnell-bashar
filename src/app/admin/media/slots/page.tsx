import { slotAdminDelegates } from "@/server/content/slot-admin-db";

import { ImageSlotsManagerClient } from "./ui";

export const dynamic = "force-dynamic";

export default async function AdminImageSlotsPage() {
  const delegates = slotAdminDelegates();
  if (!delegates.slotRegistry || !delegates.contentSlot || !delegates.mediaAsset) {
    return <ImageSlotsManagerClient initialSlots={[]} assets={[]} />;
  }

  let items: Array<{
    registry: { key: string; defaultPath: string; discoveredFrom: string; usageType: string };
    slot: { key: string; assetId: string | null; value: string | null; alt: string | null; asset?: { id: string; filename: string; path: string; alt: string | null } | null } | null;
  }> = [];
  let assets: Array<{
    id: string;
    filename: string;
    path: string;
    alt: string | null;
    variants?: Array<{
      id: string;
      kind: "hero" | "gallery" | "thumbnail" | "custom";
      path: string;
    }>;
  }> = [];

  try {
    const [registry, slots, mediaAssets] = await Promise.all([
      delegates.slotRegistry.findMany({
        orderBy: [{ discoveredFrom: "asc" }, { key: "asc" }],
      }) as Promise<Array<{ key: string; defaultPath: string; discoveredFrom: string; usageType: string }>>,
      delegates.contentSlot.findMany({
        include: { asset: true },
      }) as Promise<Array<{ key: string; assetId: string | null; value: string | null; alt: string | null; asset?: { id: string; filename: string; path: string; alt: string | null } | null }>>,
      delegates.mediaAsset.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 400,
        include: { variants: { orderBy: { createdAt: "desc" } } },
      }) as Promise<Array<{ id: string; filename: string; path: string; alt: string | null; variants: Array<{ id: string; kind: "hero" | "gallery" | "thumbnail" | "custom"; path: string }> }>>,
    ]);

    const slotByKey = new Map(slots.map((slot) => [slot.key, slot]));
    items = registry.map((entry) => ({ registry: entry, slot: slotByKey.get(entry.key) ?? null }));
    assets = mediaAssets;
  } catch {}

  return <ImageSlotsManagerClient initialSlots={items} assets={assets} />;
}
