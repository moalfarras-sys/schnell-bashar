import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

export const revalidate = 300;

export async function GET() {
  try {
    const jobs = await prisma.jobPosting.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        department: true,
        location: true,
        type: true,
        description: true,
        requirements: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("[GET /api/jobs] DB unavailable", error);
    return NextResponse.json(
      {
        jobs: [],
        warning: "Jobs konnten gerade nicht geladen werden.",
      },
      { status: 200 },
    );
  }
}
