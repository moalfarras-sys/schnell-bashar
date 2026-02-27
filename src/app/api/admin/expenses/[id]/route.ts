import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { requireAdminPermission } from "@/server/auth/require-admin-permission";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const claims = await requireAdminPermission("accounting.update");
  if (!claims) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await context.params;
  const existing = await prisma.expenseEntry.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: "Ausgabe nicht gefunden." }, { status: 404 });
  }

  await prisma.expenseEntry.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: claims.uid ?? claims.email,
      version: { increment: 1 },
    },
  });

  return NextResponse.json({ ok: true });
}

