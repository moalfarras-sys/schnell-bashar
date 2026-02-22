import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/server/auth/require-admin";
import { slotAdminDelegates } from "@/server/content/slot-admin-db";
import { CONTENT_SLOTS_TAG } from "@/server/content/slots";

const updateSchema = z.object({
  key: z.string().min(1),
  assetId: z.string().nullable().optional(),
  value: z.string().nullable().optional(),
  alt: z.string().nullable().optional(),
});

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const delegates = slotAdminDelegates();
  if (!delegates.slotRegistry || !delegates.contentSlot) {
    return NextResponse.json({ slots: [], warning: "Slot DB nicht bereit" });
  }

  try {
    const rows = await delegates.slotRegistry.findMany({
      orderBy: [{ discoveredFrom: "asc" }, { key: "asc" }],
    }) as Array<{ key: string; defaultPath: string; discoveredFrom: string; usageType: string }>;

    const slots = await delegates.contentSlot.findMany({
      where: { key: { in: rows.map((row) => row.key) } },
      include: { asset: true },
    }) as Array<{ key: string }>;
    const byKey = new Map(slots.map((slot) => [slot.key, slot]));

    const items = rows.map((row) => ({
      ...row,
      slot: byKey.get(row.key) ?? null,
    }));

    return NextResponse.json({ slots: items });
  } catch {
    return NextResponse.json({ slots: [], warning: "Slot DB Fehler" });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const delegates = slotAdminDelegates();
  if (!delegates.contentSlot) {
    return NextResponse.json({ error: "Slot DB nicht bereit" }, { status: 503 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  await delegates.contentSlot.upsert({
    where: { key: payload.key },
    update: {
      assetId: payload.assetId === undefined ? undefined : payload.assetId,
      value: payload.value === undefined ? undefined : payload.value,
      alt: payload.alt === undefined ? undefined : payload.alt,
    },
    create: {
      key: payload.key,
      type: "image",
      assetId: payload.assetId ?? null,
      value: payload.value ?? null,
      alt: payload.alt ?? null,
    },
  });

  revalidateTag(CONTENT_SLOTS_TAG, "max");
  revalidatePath("/", "layout");
  return NextResponse.json({ success: true });
}
