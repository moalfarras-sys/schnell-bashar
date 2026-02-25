import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/server/auth/require-admin";
import { slotAdminDelegates } from "@/server/content/slot-admin-db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const delegates = slotAdminDelegates();
  if (!delegates.mediaAsset) return NextResponse.json({ error: "Media DB nicht bereit" }, { status: 503 });

  try {
    const { id } = await params;
    const asset = await delegates.mediaAsset.findUnique({
      where: { id },
      include: { variants: { orderBy: { createdAt: "desc" } } },
    });
    if (!asset) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    return NextResponse.json({ asset });
  } catch {
    return NextResponse.json({ error: "Media DB Fehler" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const delegates = slotAdminDelegates();
  if (!delegates.mediaAsset) return NextResponse.json({ error: "Media DB nicht bereit" }, { status: 503 });

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const alt = typeof body.alt === "string" ? body.alt : undefined;
    const title = typeof body.title === "string" ? body.title : undefined;

    if (alt === undefined && title === undefined) {
      return NextResponse.json({ error: "Keine Ä?nderungen" }, { status: 400 });
    }

    const data: Record<string, string> = {};
    if (alt !== undefined) data.alt = alt;
    if (title !== undefined) data.title = title;

    const updated = await delegates.mediaAsset.update({
      where: { id },
      data,
      select: { id: true, alt: true, title: true },
    });

    return NextResponse.json({ success: true, asset: updated });
  } catch {
    return NextResponse.json({ error: "Media DB Fehler" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const delegates = slotAdminDelegates();
  if (!delegates.mediaAsset) return NextResponse.json({ error: "Media DB nicht bereit" }, { status: 503 });

  try {
    const { id } = await params;
    const existing = await delegates.mediaAsset.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    await delegates.mediaAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Media DB Fehler" }, { status: 500 });
  }
}
