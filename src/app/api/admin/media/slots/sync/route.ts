import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdminSession } from "@/server/auth/require-admin";
import { CONTENT_SLOTS_TAG } from "@/server/content/slots";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

export async function POST() {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    const discover = await execFileAsync("npx", ["tsx", "scripts/discover-image-slots.ts"], {
      cwd: process.cwd(),
      windowsHide: true,
    });
    const placeholders = await execFileAsync("npx", ["tsx", "scripts/generate-image-placeholders.ts"], {
      cwd: process.cwd(),
      windowsHide: true,
    });
    const result = await execFileAsync("npx", ["tsx", "scripts/sync-image-slots.ts", "--apply-prune"], {
      cwd: process.cwd(),
      windowsHide: true,
    });
    revalidateTag(CONTENT_SLOTS_TAG, "max");
    revalidatePath("/", "layout");
    return NextResponse.json({
      success: true,
      output: `${discover.stdout ?? ""}\n${placeholders.stdout ?? ""}\n${result.stdout ?? ""}`.trim(),
    });
  } catch (error) {
    const message =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr?: string }).stderr ?? "sync failed")
        : "sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
