import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdminSession } from "@/server/auth/require-admin";
import { CONTENT_SLOTS_TAG } from "@/server/content/slots";
import { formatImageSlotSyncSummary, syncImageSlotsInProcess } from "@/server/content/sync-image-slots";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    const stats = await syncImageSlotsInProcess();
    revalidateTag(CONTENT_SLOTS_TAG, "max");
    revalidatePath("/", "layout");
    return NextResponse.json({
      success: true,
      output: formatImageSlotSyncSummary(stats),
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
