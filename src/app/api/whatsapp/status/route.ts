import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  phone: z.string().min(6),
  orderId: z.string().min(4),
  status: z.string().min(2),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  }

  const phone = parsed.data.phone.replace(/[^\d]/g, "");
  const msg = encodeURIComponent(
    `Update zu Ihrer Anfrage ${parsed.data.orderId}: Status ist jetzt ${parsed.data.status}.`,
  );
  const whatsappUrl = `https://wa.me/${phone}?text=${msg}`;

  return NextResponse.json({
    ok: true,
    whatsappUrl,
    note: "Senden erfolgt aktuell manuell per WhatsApp-Link. API-Provider kann später integriert werden.",
  });
}

