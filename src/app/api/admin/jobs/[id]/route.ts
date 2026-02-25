import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.description === "string") data.description = body.description.trim();
  if (typeof body.department === "string") data.department = body.department.trim() || null;
  if (typeof body.location === "string") data.location = body.location.trim() || "Berlin";
  if (typeof body.type === "string") data.type = body.type.trim() || "Vollzeit";
  if (typeof body.requirements === "string") data.requirements = body.requirements.trim() || null;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Keine Ä?nderungen" }, { status: 400 });
  }

  try {
    const job = await prisma.jobPosting.update({ where: { id }, data });
    return NextResponse.json({ job });
  } catch {
    return NextResponse.json({ error: "Stellenangebot nicht gefunden" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.jobPosting.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Stellenangebot nicht gefunden" }, { status: 404 });
  }
}
