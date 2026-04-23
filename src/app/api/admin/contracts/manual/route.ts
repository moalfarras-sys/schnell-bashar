import { NextRequest, NextResponse } from "next/server";

import { calculateLineItem } from "@/lib/documents/calculations";
import { createDocumentDraft } from "@/lib/documents/service";
import { getAdminSessionClaims } from "@/server/auth/require-admin";

export async function POST(req: NextRequest) {
  const claims = await getAdminSessionClaims();
  if (!claims?.uid) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const services = Array.isArray(body.services)
    ? body.services.filter((value: unknown): value is string => typeof value === "string")
    : [];
  const grossCents = typeof body.grossCents === "number" ? body.grossCents : 0;
  const netCents =
    typeof body.netCents === "number" ? body.netCents : Math.round(grossCents / 1.19);

  const document = await createDocumentDraft(
    {
      type: "AUFTRAG_VERTRAG",
      customerData: {
        name: String(body.customerName || ""),
        email: body.customerEmail ? String(body.customerEmail) : null,
        phone: body.customerPhone ? String(body.customerPhone) : null,
        billingAddress: body.customerAddress ? String(body.customerAddress) : null,
      },
      serviceData: {
        serviceType: services.join(", ") || "Auftrag / Vertrag",
        serviceDate: body.moveDate ? String(body.moveDate) : null,
      },
      addressData: {
        fromAddress: body.moveFrom ? String(body.moveFrom) : null,
        toAddress: body.moveTo ? String(body.moveTo) : null,
      },
      visibleNotes: body.notes ? String(body.notes) : null,
      internalNotes: "Manuell aus Alt-Formular erstellt.",
      lineItems: [
        calculateLineItem({
          position: 1,
          title: services[0] || "Auftrag / Vertrag",
          description: services.slice(1).join(", ") || null,
          quantity: 1,
          unit: "Pauschale",
          unitPriceNetCents: netCents,
          vatRate: 19,
        }),
      ],
    },
    claims.uid,
  );

  return NextResponse.json(
    {
      success: true,
      documentId: document.id,
      documentNumber: document.number,
      message:
        "Der Vertragsentwurf wurde erstellt. Eine Unterschrift ist erst nach administrativer Freigabe möglich.",
    },
    { status: 201 },
  );
}
