import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Dieser Legacy-Signaturpfad ist deaktiviert. Bitte nutzen Sie nur den aktuellen Freigabe-Link nach Prüfung durch Schnell Sicher Umzug.",
    },
    { status: 403 },
  );
}
