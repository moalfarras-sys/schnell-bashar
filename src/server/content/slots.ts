import path from "node:path";
import { unstable_cache } from "next/cache";

import { prisma } from "@/server/db/prisma";

export const CONTENT_SLOTS_TAG = "content-slots";

export type SlotLookup = {
  key: string;
  fallbackSrc?: string;
  fallbackAlt?: string;
};

export type ResolvedImageSlot = {
  key: string;
  src: string;
  alt: string;
  source: "asset" | "slot-value" | "registry-default" | "fallback";
};

function normalizePublicSrc(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  if (trimmed.startsWith("media/") || trimmed.startsWith("uploads/")) return `/${trimmed}`;
  return trimmed;
}

const getSlotRecordCached = unstable_cache(
  async (key: string) => {
    const contentSlotDelegate = (prisma as unknown as {
      contentSlot?: {
        findUnique: (args: unknown) => Promise<unknown>;
      };
    }).contentSlot;
    const slotRegistryDelegate = (prisma as unknown as {
      slotRegistry?: {
        findUnique: (args: unknown) => Promise<unknown>;
      };
    }).slotRegistry;

    if (!contentSlotDelegate || !slotRegistryDelegate) {
      console.warn(`[slots] Prisma delegates unavailable for key "${key}", using fallback.`);
      return { slot: null, registry: null };
    }

    try {
      const [slot, registry] = await Promise.all([
        contentSlotDelegate.findUnique({
          where: { key },
          include: { asset: true },
        }) as Promise<{
          value?: string | null;
          alt?: string | null;
          asset?: { path?: string | null; alt?: string | null; title?: string | null } | null;
        } | null>,
        slotRegistryDelegate.findUnique({ where: { key } }) as Promise<{
          defaultPath?: string | null;
        } | null>,
      ]);
      return { slot, registry };
    } catch {
      console.warn(`[slots] Failed to resolve key "${key}", using fallback.`);
      return { slot: null, registry: null };
    }
  },
  ["content-slot-record"],
  { tags: [CONTENT_SLOTS_TAG] },
);

export async function getImageSlot(input: SlotLookup): Promise<ResolvedImageSlot> {
  const { slot, registry } = await getSlotRecordCached(input.key);

  const assetPath = normalizePublicSrc(slot?.asset?.path);
  if (assetPath) {
    return {
      key: input.key,
      src: assetPath,
      alt: slot?.alt ?? slot?.asset?.alt ?? slot?.asset?.title ?? input.fallbackAlt ?? "",
      source: "asset",
    };
  }

  const slotValue = normalizePublicSrc(slot?.value);
  if (slotValue) {
    return {
      key: input.key,
      src: slotValue,
      alt: slot?.alt ?? input.fallbackAlt ?? "",
      source: "slot-value",
    };
  }

  const registryDefault = normalizePublicSrc(registry?.defaultPath);
  if (registryDefault) {
    return {
      key: input.key,
      src: registryDefault,
      alt: slot?.alt ?? input.fallbackAlt ?? "",
      source: "registry-default",
    };
  }

  return {
    key: input.key,
    src: normalizePublicSrc(input.fallbackSrc) ?? "",
    alt: input.fallbackAlt ?? "",
    source: "fallback",
  };
}

export async function getImageSlots(inputs: SlotLookup[]): Promise<Record<string, ResolvedImageSlot>> {
  const resolved = await Promise.all(inputs.map((slot) => getImageSlot(slot)));
  return Object.fromEntries(resolved.map((entry) => [entry.key, entry]));
}

const getTextSlotCached = unstable_cache(
  async (key: string): Promise<string | null> => {
    const contentSlotDelegate = (prisma as unknown as {
      contentSlot?: {
        findUnique: (args: unknown) => Promise<unknown>;
      };
    }).contentSlot;
    if (!contentSlotDelegate) return null;
    try {
      const row = (await contentSlotDelegate.findUnique({
        where: { key },
      })) as { value?: string | null; type?: string } | null;
      if (row?.type === "text" && row.value) return row.value;
      return null;
    } catch {
      return null;
    }
  },
  ["text-slot-record"],
  { tags: [CONTENT_SLOTS_TAG] },
);

export async function getTextSlot(key: string, fallback: string): Promise<string> {
  const val = await getTextSlotCached(key);
  return val ?? fallback;
}

export async function getTextSlots(
  inputs: Array<{ key: string; fallback: string }>,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    inputs.map(async (i) => [i.key, await getTextSlot(i.key, i.fallback)] as const),
  );
  return Object.fromEntries(entries);
}

export function publicSrcToAbsolute(src: string): string | null {
  const normalized = normalizePublicSrc(src);
  if (!normalized) return null;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return null;
  return path.join(process.cwd(), "public", normalized.replace(/^\//, ""));
}
