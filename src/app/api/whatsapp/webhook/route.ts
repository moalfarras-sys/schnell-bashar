import { NextResponse } from "next/server";

const inMemoryConversationState = new Map<string, { state: string; updatedAt: number }>();

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "WhatsApp webhook endpoint ist aktiv. Für produktive Nutzung bitte Provider (Meta/Twilio) anbinden.",
  });
}

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  const phone = String(payload?.from || payload?.phone || "").replace(/[^\d]/g, "");
  const text = String(payload?.text || payload?.message || "").trim().toLowerCase();

  if (!phone) {
    return NextResponse.json({ error: "Keine Telefonnummer übermittelt." }, { status: 400 });
  }

  const current = inMemoryConversationState.get(phone)?.state || "greeting";
  let nextState = current;
  let reply =
    "Hallo! Willkommen bei Schnell Sicher Umzug. Antworten Sie mit 1 (Umzug), 2 (Entsorgung) oder 3 (Buchungslink).";

  if (text === "1") {
    nextState = "service_selection";
    reply =
      "Perfekt. Für Umzug starten Sie bitte hier: https://schnellumzug-berlin.de/buchen";
  } else if (text === "2") {
    nextState = "service_selection";
    reply =
      "Für Entsorgung starten Sie bitte hier: https://schnellumzug-berlin.de/buchen";
  } else if (text === "3" || text.includes("link")) {
    nextState = "awaiting_booking";
    reply =
      "Hier ist Ihr Buchungslink: https://schnellumzug-berlin.de/buchen";
  }

  inMemoryConversationState.set(phone, { state: nextState, updatedAt: Date.now() });

  return NextResponse.json({
    ok: true,
    phone,
    state: nextState,
    reply,
  });
}
