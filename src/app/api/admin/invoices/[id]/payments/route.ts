import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { hasPermission } from "@/server/auth/admin-permissions";

async function verifyAdmin(requiredPermission: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return false;
  try {
    const claims = await verifyAdminToken(token);
    return hasPermission(claims.roles, claims.permissions, requiredPermission);
  } catch {
    return false;
  }
}

function computeInvoiceStatus(grossCents: number, totalPaid: number) {
  if (totalPaid >= grossCents) return "PAID" as const;
  if (totalPaid > 0) return "PARTIAL" as const;
  return "UNPAID" as const;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifyAdmin("accounting.update"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: invoiceId } = await params;

  try {
    const body = await req.json();
    const { amountCents, method = "BANK_TRANSFER", reference, notes, paidAt } = body;

    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: "Betrag muss gr\u00F6\u00DFer als 0 sein." }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amountCents,
        method,
        reference: reference || null,
        notes: notes || null,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      },
    });

    const newPaidCents = invoice.paidCents + amountCents;
    const newStatus = computeInvoiceStatus(invoice.grossCents, newPaidCents);

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidCents: newPaidCents, status: newStatus },
    });

    return NextResponse.json({ success: true, payment, newStatus, newPaidCents });
  } catch (error) {
    console.error("Error recording payment:", error);
    return NextResponse.json(
      { error: "Zahlung konnte nicht erfasst werden." },
      { status: 500 },
    );
  }
}
