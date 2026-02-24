import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { hasPermission } from "@/server/auth/admin-permissions";
import { nextDocumentNumber } from "@/server/ids/document-number";

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

export async function GET() {
  if (!(await verifyAdmin("accounting.read"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await prisma.invoice.findMany({
    include: { payments: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin("accounting.update"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      address,
      description,
      lineItems,
      netCents,
      dueDays = 14,
      contractId,
      offerId,
      orderId,
    } = body;

    if (!customerName || !customerEmail || netCents == null) {
      return NextResponse.json(
        { error: "Name, E-Mail und Betrag sind erforderlich." },
        { status: 400 },
      );
    }

    const vatCents = Math.round(netCents * 0.19);
    const grossCents = netCents + vatCents;
    const invoiceNo = await nextDocumentNumber("OFFER");
    const rechnungNo = invoiceNo.replace("ANG-", "RE-");

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: rechnungNo,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        address: address || null,
        description: description || null,
        lineItems: lineItems || null,
        netCents,
        vatCents,
        grossCents,
        issuedAt: new Date(),
        dueAt: addDays(new Date(), dueDays),
        isManual: !contractId,
        contractId: contractId || null,
        offerId: offerId || null,
        orderId: orderId || null,
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Rechnung konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
