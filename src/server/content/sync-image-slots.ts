import { readFile } from "node:fs/promises";
import path from "node:path";

import { slotAdminDelegates } from "@/server/content/slot-admin-db";

type SlotEntry = {
  key: string;
  defaultPath: string;
  discoveredFrom: string;
  usageType: string;
};

type SlotMapFile = {
  generatedAt: string;
  count: number;
  slots: SlotEntry[];
  rejectedCount?: number;
  rejected?: Array<{ candidate: string; discoveredFrom: string; reason: string }>;
};

const MAP_PATH = path.join(process.cwd(), "scripts", "generated", "image-slots-map.json");

function legacyGalleryPath(index: string) {
  return ["/media/gallery", `${index}.jpeg`].join("/");
}

const PATH_FALLBACKS = new Map<string, string>([
  [legacyGalleryPath("1"), "/media/gallery/team-back.jpeg"],
  [legacyGalleryPath("2"), "/media/gallery/team-portrait-2.jpeg"],
]);

function resolvePreferredImagePath(raw: string) {
  const normalized = raw.trim().replace(/\\/g, "/");
  const withSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return PATH_FALLBACKS.get(withSlash) ?? withSlash;
}

async function readMap() {
  const raw = await readFile(MAP_PATH, "utf8");
  return JSON.parse(raw) as SlotMapFile;
}

export async function syncImageSlotsInProcess() {
  const delegates = slotAdminDelegates();
  if (!delegates.slotRegistry || !delegates.contentSlot) {
    throw new Error("Slot-Verwaltung ist in dieser Umgebung nicht verfügbar.");
  }

  const map = await readMap();
  const validKeys = new Set(map.slots.map((entry) => entry.key));

  let registryInserted = 0;
  let registryUpdated = 0;
  let slotInserted = 0;
  let registryPruned = 0;
  let slotPruned = 0;

  for (const entry of map.slots) {
    const preferredDefaultPath = resolvePreferredImagePath(entry.defaultPath);
    const existingRegistry = (await delegates.slotRegistry.findUnique({
      where: { key: entry.key },
      select: { id: true, defaultPath: true, discoveredFrom: true, usageType: true },
    })) as
      | { id: string; defaultPath: string; discoveredFrom: string; usageType: string }
      | null;

    if (!existingRegistry) {
      await delegates.slotRegistry.create({
        data: {
          key: entry.key,
          defaultPath: preferredDefaultPath,
          discoveredFrom: entry.discoveredFrom,
          usageType: entry.usageType,
        },
      });
      registryInserted += 1;
    } else if (
      existingRegistry.defaultPath !== preferredDefaultPath ||
      existingRegistry.discoveredFrom !== entry.discoveredFrom ||
      existingRegistry.usageType !== entry.usageType
    ) {
      await delegates.slotRegistry.update({
        where: { key: entry.key },
        data: {
          defaultPath: preferredDefaultPath,
          discoveredFrom: entry.discoveredFrom,
          usageType: entry.usageType,
        },
      });
      registryUpdated += 1;
    }

    const existingSlot = (await delegates.contentSlot.findUnique({
      where: { key: entry.key },
      select: { id: true },
    })) as { id: string } | null;

    if (!existingSlot) {
      await delegates.contentSlot.create({
        data: {
          key: entry.key,
          type: "image",
          value: preferredDefaultPath,
        },
      });
      slotInserted += 1;
    }
  }

  const staleAutoRegistry = (await delegates.slotRegistry.findMany({
    where: { key: { startsWith: "img.auto." } },
    select: { key: true },
  })) as Array<{ key: string }>;

  const registryKeysToPrune = staleAutoRegistry
    .map((row) => row.key)
    .filter((key) => !validKeys.has(key));

  if (registryKeysToPrune.length > 0) {
    registryPruned = registryKeysToPrune.length;
    await delegates.slotRegistry.deleteMany({
      where: { key: { in: registryKeysToPrune } },
    });

    const staleSlots = (await delegates.contentSlot.findMany({
      where: { key: { in: registryKeysToPrune } },
      select: { key: true },
    })) as Array<{ key: string }>;

    slotPruned = staleSlots.length;
    if (staleSlots.length > 0) {
      await delegates.contentSlot.deleteMany({
        where: { key: { in: staleSlots.map((slot) => slot.key) } },
      });
    }
  }

  return {
    generatedAt: map.generatedAt,
    mapCount: map.count,
    rejectedCount: map.rejectedCount ?? map.rejected?.length ?? 0,
    registryInserted,
    registryUpdated,
    slotInserted,
    registryPruned,
    slotPruned,
  };
}

export function formatImageSlotSyncSummary(
  stats: Awaited<ReturnType<typeof syncImageSlotsInProcess>>,
) {
  return [
    "Scan & Sync erfolgreich abgeschlossen.",
    `Map-Einträge: ${stats.mapCount}`,
    `Abgelehnte Kandidaten: ${stats.rejectedCount}`,
    `Registry neu: ${stats.registryInserted}`,
    `Registry aktualisiert: ${stats.registryUpdated}`,
    `Slots neu: ${stats.slotInserted}`,
    `Registry bereinigt: ${stats.registryPruned}`,
    `Slots bereinigt: ${stats.slotPruned}`,
  ].join("\n");
}
