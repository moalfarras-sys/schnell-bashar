import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().min(3).max(120),
  limit: z.coerce.number().int().min(1).max(10).default(6),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { q, limit } = parsed.data;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "de");
  url.searchParams.set("accept-language", "de");
  url.searchParams.set("q", q);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "SchnellSicherUmzug/1.0 (kontakt@schnellsicherumzug.de)",
    },
    // Avoid caching user searches at the edge.
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Adresssuche fehlgeschlagen" }, { status: 502 });
  }

  const data = (await res.json()) as any[];

  const results = data
    .map((x) => {
      const a = x.address ?? {};
      const city = a.city || a.town || a.village || a.municipality || a.county || "";
      return {
        displayName: x.display_name as string,
        postalCode: (a.postcode as string) ?? "",
        city,
        state: (a.state as string) ?? undefined,
        street: (a.road as string) ?? undefined,
        houseNumber: (a.house_number as string) ?? undefined,
        lat: Number(x.lat),
        lon: Number(x.lon),
      };
    })
    .filter((r) => r.postalCode && r.city && Number.isFinite(r.lat) && Number.isFinite(r.lon));

  return NextResponse.json({ results });
}


