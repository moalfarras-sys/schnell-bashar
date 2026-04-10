import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/server/db/prisma";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { hasPermission } from "@/server/auth/admin-permissions";
import { formatManualDocumentNo, nextDocumentNumber } from "@/server/ids/document-number";
import { buildManualInvoiceMeta } from "@/lib/manual-invoice";

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

export async function GET() {
  if (!(await verifyAdmin("accounting.read"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await prisma.invoice.findMany({
    include: { payments: true, items: { orderBy: { sortOrder: "asc" } } },
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
      notes,
      items,
      netCents: clientNetCents,
      vatCents: clientVatCents,
      grossCents: clientGrossCents,
      dueDays = 14,
      issuedAt,
      paymentStatus,
      initialPaymentCents,
      initialPaymentMethod,
      paymentReference,
      discountPercent,
      invoiceSuffix,
      contractId,
      offerId,
      orderId,
      manualReferences,
      serviceDetails,
    } = body;

    if (!customerName || !customerEmail) {
      return NextResponse.json(
        { error: "Name und E-Mail sind erforderlich." },
        { status: 400 },
      );
    }

    let netCents: number;
    let vatCents: number;
    let grossCents: number;
    let discountCents: number | undefined;
    const lineItems: Array<{
      description: string;
      quantity: number;
      unit: string;
      unitPriceCents: number;
      vatPercent: number;
      lineTotalCents: number;
      sortOrder: number;
    }> = [];

    if (Array.isArray(items) && items.length > 0) {
      let subNetCents = 0;
      for (const item of items) {
        const lineTotalCents = Math.round(
          (item.quantity ?? 1) * (item.unitPriceCents ?? 0),
        );
        subNetCents += lineTotalCents;
        lineItems.push({
          description: item.description || "",
          quantity: item.quantity ?? 1,
          unit: item.unit || "Stück",
          unitPriceCents: item.unitPriceCents ?? 0,
          vatPercent: item.vatPercent ?? 19,
          lineTotalCents,
          sortOrder: item.sortOrder ?? 0,
        });
      }

      discountCents =
        discountPercent > 0
          ? Math.round(subNetCents * (discountPercent / 100))
          : undefined;

      netCents = subNetCents - (discountCents ?? 0);
      vatCents = Math.round(
        lineItems.reduce((sum, li) => {
          const share = li.lineTotalCents / (subNetCents || 1);
          return sum + Math.round((netCents * share * li.vatPercent) / 100);
        }, 0),
      );
      grossCents = netCents + vatCents;
    } else if (clientNetCents != null) {
      netCents = clientNetCents;
      vatCents = clientVatCents ?? Math.round(netCents * 0.19);
      grossCents = clientGrossCents ?? netCents + vatCents;
    } else {
      return NextResponse.json(
        { error: "Positionen oder Betrag sind erforderlich." },
        { status: 400 },
      );
    }

    const issuedDate = issuedAt ? new Date(issuedAt) : new Date();
    const normalizedInvoiceSuffix =
      typeof invoiceSuffix === "string" ? invoiceSuffix.trim() : "";
    const invoiceNo = normalizedInvoiceSuffix
      ? formatManualDocumentNo("INVOICE", normalizedInvoiceSuffix, issuedDate)
      : await nextDocumentNumber("INVOICE", issuedDate);

    if (normalizedInvoiceSuffix) {
      const existingInvoice = await prisma.invoice.findUnique({
        where: { invoiceNo },
        select: { id: true },
      });
      if (existingInvoice) {
        return NextResponse.json(
          { error: "Diese Rechnungsnummer ist bereits vergeben." },
          { status: 409 },
        );
      }
    }

    const normalizedInitialPaymentCents =
      typeof initialPaymentCents === "number"
        ? Math.max(0, Math.min(grossCents, Math.round(initialPaymentCents)))
        : 0;
    const paidCents =
      paymentStatus === "PAID"
        ? grossCents
        : paymentStatus === "PARTIAL"
          ? normalizedInitialPaymentCents
          : 0;
    const status = computeInvoiceStatus(grossCents, paidCents);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        address: address || null,
        description: description || null,
        notes: notes || null,
        discountPercent: discountPercent || null,
        discountCents: discountCents ?? null,
        netCents,
        vatCents,
        grossCents,
        paidCents,
        status,
        issuedAt: issuedDate,
        dueAt: addDays(issuedDate, dueDays),
        isManual: !contractId,
        contractId: contractId || null,
        offerId: offerId || null,
        orderId: orderId || null,
        items:
          lineItems.length > 0
            ? {
                create: lineItems.map((li) => ({
                  description: li.description,
                  quantity: li.quantity,
                  unit: li.unit,
                  unitPriceCents: li.unitPriceCents,
                  vatPercent: li.vatPercent,
                  lineTotalCents: li.lineTotalCents,
                  sortOrder: li.sortOrder,
                })),
              }
            : undefined,
        lineItems:
          buildManualInvoiceMeta({
            references: manualReferences,
            serviceDetails,
            itemDetails: Array.isArray(items)
              ? items.map((item) => ({
                  detail: item.detail,
                  workHours: item.workHours,
                  areaSqm: item.areaSqm,
                  volumeM3: item.volumeM3,
                  floor: item.floor,
                  pieces: item.pieces,
                }))
              : undefined,
          }) ??
          (lineItems.length > 0
            ? lineItems.map((li) => ({
                name: li.description,
                quantity: li.quantity,
                unit: li.unit,
                priceCents: li.lineTotalCents,
              }))
            : undefined),
        payments:
          paidCents > 0
            ? {
                create: {
                  amountCents: paidCents,
                  method: initialPaymentMethod || "BANK_TRANSFER",
                  reference: paymentReference || null,
                  notes:
                    status === "PAID"
                      ? "Automatisch als bezahlt markiert bei Erstellung"
                      : "Anzahlung bei Erstellung erfasst",
                },
              }
            : undefined,
      },
      include: { items: true, payments: true },
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
