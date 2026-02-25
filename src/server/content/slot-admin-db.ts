import { prisma } from "@/server/db/prisma";

type MediaAssetDelegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown | null>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
};
type MediaAssetVariantDelegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  create: (args: unknown) => Promise<unknown>;
  upsert: (args: unknown) => Promise<unknown>;
  deleteMany: (args: unknown) => Promise<unknown>;
};

type ContentSlotDelegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown | null>;
  upsert: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  deleteMany: (args: unknown) => Promise<unknown>;
};

type SlotRegistryDelegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<unknown | null>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  deleteMany: (args: unknown) => Promise<unknown>;
};

export function slotAdminDelegates() {
  const p = prisma as unknown as {
    mediaAsset?: MediaAssetDelegate;
    mediaAssetVariant?: MediaAssetVariantDelegate;
    contentSlot?: ContentSlotDelegate;
    slotRegistry?: SlotRegistryDelegate;
  };
  const hasFns = (value: unknown, required: string[]) =>
    Boolean(
      value &&
        typeof value === "object" &&
        required.every((name) => typeof (value as Record<string, unknown>)[name] === "function"),
    );
  return {
    mediaAsset: hasFns(p.mediaAsset, ["findMany", "findUnique", "create", "update"]) ? p.mediaAsset : null,
    mediaAssetVariant: hasFns(p.mediaAssetVariant, ["findMany", "create", "upsert", "deleteMany"])
      ? p.mediaAssetVariant
      : null,
    contentSlot: hasFns(p.contentSlot, ["findMany", "findUnique", "upsert", "create", "deleteMany"])
      ? p.contentSlot
      : null,
    slotRegistry: hasFns(p.slotRegistry, ["findMany", "findUnique", "create", "update", "deleteMany"])
      ? p.slotRegistry
      : null,
  };
}

export function hasSlotAdminDelegates() {
  const d = slotAdminDelegates();
  return Boolean(d.mediaAsset && d.mediaAssetVariant && d.contentSlot && d.slotRegistry);
}
