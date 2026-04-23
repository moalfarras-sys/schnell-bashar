import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Dieser Legacy-Endpunkt ist deaktiviert. Signaturfreigaben werden jetzt ausschließlich im Dokumentenbereich verwaltet.",
    },
    { status: 410 },
  );
}
