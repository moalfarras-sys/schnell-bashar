import { NextResponse } from "next/server";

import { requireAdminPermission } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  const auth = await requireAdminPermission("dashboard.view");
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [newRequests, offersPending, offersAccepted, contractsPending, contractsSigned, invoicesOpen, outstanding] =
    await Promise.all([
      prisma.order.count({ where: { status: { in: ["NEW", "REQUESTED"] } } }),
      prisma.offer.count({ where: { status: "PENDING" } }),
      prisma.offer.count({ where: { status: "ACCEPTED" } }),
      prisma.contract.count({ where: { status: "PENDING_SIGNATURE" } }),
      prisma.contract.count({ where: { status: "SIGNED" } }),
      prisma.invoice.count({ where: { status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] } } }),
      prisma.invoice.aggregate({
        _sum: { grossCents: true, paidCents: true },
        where: { status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] }, issuedAt: { gte: startOfMonth } },
      }),
    ]);

  const outstandingCents =
    (outstanding._sum.grossCents ?? 0) - (outstanding._sum.paidCents ?? 0);

  return NextResponse.json({
    ok: true,
    kpis: {
      newRequests,
      offersPending,
      offersAccepted,
      contractsPending,
      contractsSigned,
      invoicesOpen,
      outstandingCents: Math.max(0, outstandingCents),
    },
  });
}
