import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Dieser Legacy-Endpunkt ist deaktiviert. Nutzen Sie die Freigabe im Dokumentenbereich unter /admin/dokumente.",
    },
    { status: 410 },
  );
}
