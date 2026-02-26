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
      items,
      netCents: clientNetCents,
      vatCents: clientVatCents,
      grossCents: clientGrossCents,
      dueDays = 14,
      issuedAt,
      paymentStatus,
      discountPercent,
      contractId,
      offerId,
      orderId,
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

    const invoiceNo = await nextDocumentNumber("OFFER");
    const rechnungNo = invoiceNo.replace("ANG-", "RE-");

    const issuedDate = issuedAt ? new Date(issuedAt) : new Date();
    const isPaid = paymentStatus === "PAID";

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: rechnungNo,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        address: address || null,
        description: description || null,
        notes: description || null,
        discountPercent: discountPercent || null,
        discountCents: discountCents ?? null,
        netCents,
        vatCents,
        grossCents,
        paidCents: isPaid ? grossCents : 0,
        status: isPaid ? "PAID" : "UNPAID",
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
          lineItems.length > 0
            ? lineItems.map((li) => ({
                name: li.description,
                quantity: li.quantity,
                unit: li.unit,
                priceCents: li.lineTotalCents,
              }))
            : null,
        payments: isPaid
          ? {
              create: {
                amountCents: grossCents,
                method: "BANK_TRANSFER",
                notes: "Automatisch als bezahlt markiert bei Erstellung",
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
