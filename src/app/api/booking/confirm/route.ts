import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SUNSET_AT = "2026-05-31T23:59:59Z";

function deprecationHeaders() {
  return {
    Deprecation: "true",
    Sunset: SUNSET_AT,
    Link: '</api/orders>; rel="successor-version", </booking>; rel="successor-version"',
  };
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Der Endpunkt /api/booking/confirm ist veraltet und wurde abgeschaltet. Bitte verwenden Sie den Buchungsfluss über /booking und /api/orders.",
      replacement: {
        bookingPage: "/booking",
        orderApi: "/api/orders",
      },
    },
    { status: 410, headers: deprecationHeaders() },
  );
}
