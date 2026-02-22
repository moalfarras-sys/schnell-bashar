import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { prisma } from "@/server/db/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    await verifyAdminToken(token);
  } catch {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { contractId } = await params;

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });

  await prisma.contract.update({
    where: { id: contractId },
    data: {
      status: "CANCELLED",
      docusignStatus: contract.signatureProvider === "INTERNAL" ? "internal_cancelled" : "cancelled",
    },
  });

  return NextResponse.json({ success: true });
}
