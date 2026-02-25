import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "../src/server/db/prisma";
import { resolvePreferredImagePath } from "./image-fallback-map";

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

async function readMap(): Promise<SlotMapFile> {
  const raw = await fs.readFile(MAP_PATH, "utf8");
  return JSON.parse(raw) as SlotMapFile;
}
function parseFlags() {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has("--dry-run"),
    applyPrune: args.has("--apply-prune"),
  };
}

async function main() {
  const { dryRun, applyPrune } = parseFlags();
  const map = await readMap();
  let registryInserted = 0;
  let registryUpdated = 0;
  let slotInserted = 0;
  let registryPruned = 0;
  let slotPruned = 0;
  const validKeys = new Set(map.slots.map((entry) => entry.key));

  for (const entry of map.slots) {
    const preferredDefaultPath = resolvePreferredImagePath(entry.defaultPath);

    const existingRegistry = await prisma.slotRegistry.findUnique({
      where: { key: entry.key },
      select: { id: true, defaultPath: true, discoveredFrom: true, usageType: true },
    });

    if (!existingRegistry) {
      if (!dryRun) {
        await prisma.slotRegistry.create({
          data: {
            key: entry.key,
            defaultPath: preferredDefaultPath,
            discoveredFrom: entry.discoveredFrom,
            usageType: entry.usageType,
          },
        });
      }
      registryInserted += 1;
    } else if (
      existingRegistry.defaultPath !== preferredDefaultPath ||
      existingRegistry.discoveredFrom !== entry.discoveredFrom ||
      existingRegistry.usageType !== entry.usageType
    ) {
      if (!dryRun) {
        await prisma.slotRegistry.update({
          where: { key: entry.key },
          data: {
            defaultPath: preferredDefaultPath,
            discoveredFrom: entry.discoveredFrom,
            usageType: entry.usageType,
          },
        });
      }
      registryUpdated += 1;
    }

    const existingSlot = await prisma.contentSlot.findUnique({
      where: { key: entry.key },
      select: { id: true },
    });
    if (!existingSlot) {
      if (!dryRun) {
        await prisma.contentSlot.create({
          data: {
            key: entry.key,
            type: "image",
            value: preferredDefaultPath,
          },
        });
      }
      slotInserted += 1;
    }
  }
  if (applyPrune) {
    const staleAutoRegistry = await prisma.slotRegistry.findMany({
      where: {
        key: { startsWith: "img.auto." },
      },
      select: { key: true },
    });
    const registryKeysToPrune = staleAutoRegistry
      .map((row) => row.key)
      .filter((key) => !validKeys.has(key));

    if (registryKeysToPrune.length > 0) {
      registryPruned = registryKeysToPrune.length;
      if (!dryRun) {
        await prisma.slotRegistry.deleteMany({
          where: { key: { in: registryKeysToPrune } },
        });
      }
    }

    if (registryKeysToPrune.length > 0) {
      const staleSlots = await prisma.contentSlot.findMany({
        where: { key: { in: registryKeysToPrune } },
        select: { key: true },
      });
      slotPruned = staleSlots.length;
      if (!dryRun && staleSlots.length > 0) {
        await prisma.contentSlot.deleteMany({
          where: { key: { in: staleSlots.map((slot) => slot.key) } },
        });
      }
    }
  }

  console.log("[sync-image-slots] done");
  console.log(
    JSON.stringify(
      {
        mapCount: map.count,
        rejectedCount: map.rejectedCount ?? map.rejected?.length ?? 0,
        mode: {
          dryRun,
          applyPrune,
        },
        registryInserted,
        registryUpdated,
        slotInserted,
        registryPruned,
        slotPruned,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("[sync-image-slots] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
