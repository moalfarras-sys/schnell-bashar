import { NextResponse } from "next/server";

import { requireAdminSession } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const jobs = await prisma.jobPosting.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";

  if (!title || !description) {
    return NextResponse.json({ error: "Titel und Beschreibung sind Pflichtfelder" }, { status: 400 });
  }

  const job = await prisma.jobPosting.create({
    data: {
      title,
      description,
      department: typeof body.department === "string" ? body.department.trim() || null : null,
      location: typeof body.location === "string" ? body.location.trim() || "Berlin" : "Berlin",
      type: typeof body.type === "string" ? body.type.trim() || "Vollzeit" : "Vollzeit",
      requirements: typeof body.requirements === "string" ? body.requirements.trim() || null : null,
      isActive: body.isActive !== false,
    },
  });

  return NextResponse.json({ job }, { status: 201 });
}
