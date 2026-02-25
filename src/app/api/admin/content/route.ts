import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { requireAdminSession } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";
import { CONTENT_SLOTS_TAG } from "@/server/content/slots";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    const rows = await prisma.contentSlot.findMany({
      where: { type: "text" },
      select: { key: true, value: true },
    });
    const slots: Record<string, string> = {};
    for (const r of rows) {
      if (r.value) slots[r.key] = r.value;
    }
    return NextResponse.json({ slots });
  } catch {
    return NextResponse.json({ slots: {} });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json();
  const incoming = body.slots as Record<string, string> | undefined;
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  }

  try {
    const ops = Object.entries(incoming).map(([key, value]) => {
      const trimmed = (value ?? "").trim();
      if (!trimmed) {
        return prisma.contentSlot.deleteMany({ where: { key, type: "text" } });
      }
      return prisma.contentSlot.upsert({
        where: { key },
        update: { value: trimmed, type: "text" },
        create: { key, type: "text", value: trimmed },
      });
    });
    await Promise.all(ops);

    revalidateTag(CONTENT_SLOTS_TAG, "max");
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/content] Save failed:", err);
    return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
}

