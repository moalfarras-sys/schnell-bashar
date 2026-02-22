import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

export const revalidate = 300;

export async function GET() {
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
}
