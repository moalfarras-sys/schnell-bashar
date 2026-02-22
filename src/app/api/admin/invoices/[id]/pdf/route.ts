import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { generateInvoicePDF } from "@/server/pdf/generate-invoice";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await verifyAdminToken(token);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { contract: { include: { offer: { include: { order: true } } } }, payments: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }

  const pdfBuffer = await generateInvoicePDF({
    invoiceId: invoice.id,
    invoiceNo: invoice.invoiceNo ?? undefined,
    issuedAt: invoice.issuedAt,
    dueAt: invoice.dueAt,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    customerPhone: invoice.customerPhone ?? undefined,
    address: invoice.address ?? undefined,
    description: invoice.description ?? undefined,
    lineItems: (invoice.lineItems as any) ?? undefined,
    netCents: invoice.netCents,
    vatCents: invoice.vatCents,
    grossCents: invoice.grossCents,
    paidCents: invoice.paidCents,
    contractNo: invoice.contract?.contractNo ?? undefined,
    offerNo: invoice.contract?.offer?.offerNo ?? undefined,
    orderNo: invoice.contract?.offer?.order?.orderNo ?? undefined,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNo || invoice.id}.pdf"`,
    },
  });
}
