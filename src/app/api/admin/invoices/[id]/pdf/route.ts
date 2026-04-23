import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { hasPermission } from "@/server/auth/admin-permissions";
import { generateInvoicePDF } from "@/server/pdf/generate-invoice";
import {
  manualInvoiceReferenceRows,
  manualInvoiceServiceRows,
  manualItemDetailLines,
  normalizeManualInvoiceMeta,
} from "@/lib/manual-invoice";

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
    const claims = await verifyAdminToken(token);
    if (!hasPermission(claims.roles, claims.permissions, "accounting.read")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      contract: { include: { offer: { include: { order: true } } } },
      payments: true,
      items: { orderBy: { sortOrder: "asc" } },
      offer: true,
      order: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }

  const manualMeta = normalizeManualInvoiceMeta(invoice.lineItems);
  const manualReferenceRows = manualInvoiceReferenceRows(manualMeta?.references);
  const manualServiceRows = manualInvoiceServiceRows(manualMeta?.serviceDetails);

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
    notes: invoice.notes ?? undefined,
    lineItems:
      invoice.items.length > 0
        ? invoice.items.map((item, index) => ({
            name: item.description,
            detailLines: manualItemDetailLines(manualMeta?.itemDetails?.[index]),
            quantity: item.quantity,
            unit: item.unit,
            priceCents: item.lineTotalCents,
          }))
        : ((invoice.lineItems as any) ?? undefined),
    netCents: invoice.netCents,
    vatCents: invoice.vatCents,
    grossCents: invoice.grossCents,
    paidCents: invoice.paidCents,
    contractNo:
      manualReferenceRows.find((row) => row.label === "Vertrag")?.value ??
      invoice.contract?.contractNo ??
      undefined,
    offerNo:
      manualReferenceRows.find((row) => row.label === "Angebot")?.value ??
      invoice.contract?.offer?.offerNo ??
      invoice.offer?.offerNo ??
      undefined,
    orderNo:
      manualReferenceRows.find((row) => row.label === "Auftrag")?.value ??
      invoice.contract?.offer?.order?.orderNo ??
      invoice.order?.orderNo ??
      invoice.contract?.offer?.order?.publicId ??
      invoice.order?.publicId ??
      undefined,
    manualReferenceRows,
    serviceDetailRows: manualServiceRows,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNo || "Rechnung"}.pdf"`,
    },
  });
}
