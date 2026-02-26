import { prisma } from "@/server/db/prisma";

const ORS_BASE_URL = (process.env.ORS_BASE_URL || "https://api.openrouteservice.org").replace(/\/+$/, "");
const ORS_PROFILE = "driving-car";
const DEFAULT_CACHE_TTL_DAYS = 30;

export type DistanceSource = "cache" | "ors" | "fallback";

export class ORSDistanceError extends Error {
  code:
    | "ORS_API_KEY_MISSING"
    | "ORS_BASE_URL_INVALID"
    | "ORS_TIMEOUT"
    | "ORS_FORBIDDEN"
    | "ORS_REQUEST_FAILED"
    | "ORS_DISTANCE_MISSING";
  status?: number;
  responseBody?: string;

  constructor(
    code: ORSDistanceError["code"],
    message: string,
    options?: { status?: number; responseBody?: string },
  ) {
    super(message);
    this.name = "ORSDistanceError";
    this.code = code;
    this.status = options?.status;
    this.responseBody = options?.responseBody;
  }
}

export type PointInput = {
  lat?: number;
  lon?: number;
  postalCode?: string | null;
  text?: string;
};

export type RouteDistanceInput = {
  from: PointInput;
  to: PointInput;
  profile?: string;
};

export type RouteDistanceResult = {
  distanceKm: number;
  source: DistanceSource;
  fromPostalCode: string | null;
  toPostalCode: string | null;
  profile: string;
};

type ResolvedPoint = {
  lat: number;
  lon: number;
  postalCode: string | null;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(from: ResolvedPoint, to: ResolvedPoint): number {
  const earthRadiusKm = 6371;
  const dLat = degToRad(to.lat - from.lat);
  const dLon = degToRad(to.lon - from.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degToRad(from.lat)) * Math.cos(degToRad(to.lat)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function parsePositiveNumber(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizePostalCode(value?: string | null): string | null {
  if (!value) return null;
  const match = value.trim().match(/\b\d{5}\b/);
  return match ? match[0] : null;
}

function sortPostalPair(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

async function fetchNominatim(
  query: string,
  options?: { strictGermany?: boolean },
): Promise<
  Array<{
    lat: string;
    lon: string;
    address?: { postcode?: string };
  }>
> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  if (options?.strictGermany !== false) {
    url.searchParams.set("countrycodes", "de");
  }
  url.searchParams.set("accept-language", "de");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "SchnellSicherUmzug/1.0 (kontakt@schnellsicherumzug.de)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  return (await response.json()) as Array<{
    lat: string;
    lon: string;
    address?: { postcode?: string };
  }>;
}

function normalizeAddressQuery(query: string): string {
  return query
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue");
}

function plzOnlyQueryCandidates(text: string): string[] {
  const postalCode = normalizePostalCode(text);
  if (!postalCode) return [];

  const candidates = [
    `${postalCode} Deutschland`,
    `${postalCode} Germany`,
    postalCode,
  ];
  return candidates.filter((value, index, self) => self.indexOf(value) === index);
}

async function geocodeTextAddress(text: string): Promise<ResolvedPoint> {
  const requestedPostal = normalizePostalCode(text);
  const addressCandidates = [text.trim(), normalizeAddressQuery(text.trim())].filter(
    (value, index, self) => value.length > 0 && self.indexOf(value) === index,
  );
  const postalCandidates = plzOnlyQueryCandidates(text.trim());
  const candidates: Array<{ query: string; allowRelaxed: boolean }> = [
    ...addressCandidates.map((query) => ({ query, allowRelaxed: true })),
    ...postalCandidates.map((query) => ({ query, allowRelaxed: false })),
  ];

  let data:
    | Array<{
        lat: string;
        lon: string;
        address?: { postcode?: string };
      }>
    | null = null;

  for (const candidate of candidates) {
    const strict = await fetchNominatim(candidate.query, { strictGermany: true });
    if (strict[0]) {
      const strictPostal = normalizePostalCode(strict[0].address?.postcode);
      if (requestedPostal && strictPostal && strictPostal !== requestedPostal) {
        continue;
      }
      if (requestedPostal && !strictPostal) {
        continue;
      }
      data = strict;
      break;
    }

    if (candidate.allowRelaxed) {
      const relaxed = await fetchNominatim(candidate.query, { strictGermany: false });
      if (relaxed[0]) {
        const relaxedPostal = normalizePostalCode(relaxed[0].address?.postcode);
        if (requestedPostal && relaxedPostal && relaxedPostal !== requestedPostal) {
          continue;
        }
        if (requestedPostal && !relaxedPostal) {
          continue;
        }
        data = relaxed;
        break;
      }
    }
  }

  const top = data?.[0];
  if (!top) {
    throw new Error("Address not found");
  }

  const lat = Number(top.lat);
  const lon = Number(top.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Invalid geocoding coordinates");
  }

  return {
    lat,
    lon,
    postalCode: normalizePostalCode(top.address?.postcode),
  };
}

async function resolvePoint(point: PointInput): Promise<ResolvedPoint> {
  if (Number.isFinite(point.lat) && Number.isFinite(point.lon)) {
    return {
      lat: Number(point.lat),
      lon: Number(point.lon),
      postalCode: normalizePostalCode(point.postalCode),
    };
  }

  if (point.text?.trim()) {
    return geocodeTextAddress(point.text.trim());
  }

  throw new Error("Point requires either coordinates or text");
}

function parseDistanceKm(payload: unknown): number {
  const data = payload as {
    metadata?: { query?: { units?: string } };
    routes?: Array<{ summary?: { distance?: number } }>;
    features?: Array<{ properties?: { segments?: Array<{ distance?: number }> } }>;
  };

  const units = data.metadata?.query?.units?.toLowerCase();
  const fromRoutes = data.routes?.[0]?.summary?.distance;
  const fromFeatures = data.features?.[0]?.properties?.segments?.[0]?.distance;
  const raw = Number.isFinite(fromRoutes) ? Number(fromRoutes) : Number(fromFeatures);

  if (!Number.isFinite(raw) || raw <= 0) {
    throw new ORSDistanceError("ORS_DISTANCE_MISSING", "ORS response missing route distance");
  }

  // Prefer explicit units from ORS response metadata; fallback to meter heuristic.
  if (units === "km" || units === "kilometers") return raw;
  return raw >= 100 ? raw / 1000 : raw;
}

async function callORS(from: ResolvedPoint, to: ResolvedPoint, profile: string): Promise<number> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    throw new ORSDistanceError("ORS_API_KEY_MISSING", "ORS_API_KEY is missing. Configure it in .env.");
  }
  if (!ORS_BASE_URL.startsWith("https://api.openrouteservice.org")) {
    throw new ORSDistanceError(
      "ORS_BASE_URL_INVALID",
      `Invalid ORS_BASE_URL: ${ORS_BASE_URL}. Use https://api.openrouteservice.org`,
    );
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${ORS_BASE_URL}/v2/directions/${profile}/json`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [from.lon, from.lat],
          [to.lon, to.lat],
        ],
        units: "km",
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (response.status === 403) {
        console.error(`[ORS] 403 forbidden. body=${text || "no response body"}`);
        throw new ORSDistanceError(
          "ORS_FORBIDDEN",
          "ORS access is forbidden for this key",
          { status: response.status, responseBody: text || "no response body" },
        );
      }
      throw new ORSDistanceError(
        "ORS_REQUEST_FAILED",
        `ORS request failed (${response.status})`,
        { status: response.status, responseBody: text || "no response body" },
      );
    }

    const payload = await response.json();
    const km = parseDistanceKm(payload);
    return round2(km);
  } catch (error) {
    if (error instanceof ORSDistanceError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ORSDistanceError("ORS_TIMEOUT", "ORS request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getCachedDistance(
  fromPostalCode: string,
  toPostalCode: string,
  profile: string,
): Promise<number | null> {
  const [fromKey, toKey] = sortPostalPair(fromPostalCode, toPostalCode);
  const now = new Date();
  const cached = await prisma.routeDistanceCache.findUnique({
    where: {
      fromPostalCode_toPostalCode_profile: {
        fromPostalCode: fromKey,
        toPostalCode: toKey,
        profile,
      },
    },
    select: {
      distanceKm: true,
      expiresAt: true,
    },
  });

  if (!cached || cached.expiresAt <= now) return null;
  return round2(cached.distanceKm);
}

async function setCachedDistance(
  fromPostalCode: string,
  toPostalCode: string,
  profile: string,
  distanceKm: number,
) {
  const [fromKey, toKey] = sortPostalPair(fromPostalCode, toPostalCode);
  const ttlDays = parsePositiveNumber(process.env.ORS_CACHE_TTL_DAYS, DEFAULT_CACHE_TTL_DAYS);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await prisma.routeDistanceCache.upsert({
    where: {
      fromPostalCode_toPostalCode_profile: {
        fromPostalCode: fromKey,
        toPostalCode: toKey,
        profile,
      },
    },
    create: {
      fromPostalCode: fromKey,
      toPostalCode: toKey,
      profile,
      distanceKm,
      expiresAt,
    },
    update: {
      distanceKm,
      expiresAt,
    },
  });
}

export async function resolveRouteDistance(input: RouteDistanceInput): Promise<RouteDistanceResult> {
  const profile = input.profile || ORS_PROFILE;
  const from = await resolvePoint(input.from);
  const to = await resolvePoint(input.to);
  const fromPostalCode = normalizePostalCode(input.from.postalCode) || from.postalCode;
  const toPostalCode = normalizePostalCode(input.to.postalCode) || to.postalCode;

  if (fromPostalCode && toPostalCode) {
    const cachedKm = await getCachedDistance(fromPostalCode, toPostalCode, profile);
    if (cachedKm != null) {
      return {
        distanceKm: cachedKm,
        source: "cache",
        fromPostalCode,
        toPostalCode,
        profile,
      };
    }
  }

  let orsKm: number;
  try {
    orsKm = await callORS(from, to, profile);
  } catch (error) {
    const straightKm = haversineDistanceKm(from, to);
    // Road distance fallback: apply a conservative multiplier over straight-line distance.
    const fallbackKm = round2(Math.max(1, straightKm * 1.25));
    console.error("[distance/ors] ORS failed, using fallback distance", {
      error: error instanceof Error ? error.message : "unknown",
      fromPostalCode,
      toPostalCode,
      profile,
      fallbackKm,
    });
    return {
      distanceKm: fallbackKm,
      source: "fallback",
      fromPostalCode,
      toPostalCode,
      profile,
    };
  }

  if (fromPostalCode && toPostalCode) {
    await setCachedDistance(fromPostalCode, toPostalCode, profile, orsKm);
  }

  return {
    distanceKm: orsKm,
    source: "ors",
    fromPostalCode,
    toPostalCode,
    profile,
  };
}

