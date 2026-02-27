import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SUNSET_AT = "2026-05-31T23:59:59Z";

function deprecationHeaders() {
  return {
    Deprecation: "true",
    Sunset: SUNSET_AT,
    Link: '</api/availability/dates>; rel="successor-version", </api/availability/slots>; rel="successor-version"',
  };
}

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Der Endpunkt /api/slots ist veraltet und wurde abgeschaltet. Verwenden Sie /api/availability/dates und /api/availability/slots.",
      replacement: {
        dates: "/api/availability/dates?from=YYYY-MM-DD&to=YYYY-MM-DD&speed=STANDARD&volumeM3=20",
        slots: "/api/availability/slots?date=YYYY-MM-DD&speed=STANDARD&volumeM3=20",
      },
    },
    { status: 410, headers: deprecationHeaders() },
  );
}
