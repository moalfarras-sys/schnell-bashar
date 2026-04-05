import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      disabled: true,
      reason: "DocuSign wurde entfernt. Verwenden Sie die interne Signatur.",
    },
    { status: 410 },
  );
}
