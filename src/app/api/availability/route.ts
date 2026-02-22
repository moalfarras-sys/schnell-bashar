import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Legacy GET /api/availability (single date, 24 hourly slots) is replaced by:
 * - GET /api/availability/dates?from=&to=&speed=&volumeM3=  → availableDates
 * - GET /api/availability/slots?date=&speed=&volumeM3=     → slots with start, end, label
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "Use GET /api/availability/dates and GET /api/availability/slots for availability.",
      dates: "/api/availability/dates?from=YYYY-MM-DD&to=YYYY-MM-DD&speed=ECONOMY|STANDARD|EXPRESS&volumeM3=number",
      slots: "/api/availability/slots?date=YYYY-MM-DD&speed=...&volumeM3=number",
    },
    { status: 400 },
  );
}
