import { createHash, randomBytes } from "crypto";

const DEFAULT_SIGNING_TTL_HOURS = 168;

function signingTtlHours(): number {
  const raw = Number(process.env.SIGNING_LINK_TTL_HOURS ?? DEFAULT_SIGNING_TTL_HOURS);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_SIGNING_TTL_HOURS;
  return Math.floor(raw);
}

export function hashFallbackSigningToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getFallbackSigningExpiry(now = new Date()): Date {
  return new Date(now.getTime() + signingTtlHours() * 60 * 60 * 1000);
}

export function buildFallbackSigningUrl(token: string, offerToken?: string | null): string {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const params = new URLSearchParams();
  params.set("token", token);
  if (offerToken) params.set("offer", offerToken);
  return `${baseUrl}/sign/contract?${params.toString()}`;
}

export function issueFallbackSigningToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashFallbackSigningToken(token),
  };
}

export function parseClientIp(rawForwardedFor: string | null, fallbackIp: string | null): string | null {
  if (rawForwardedFor) {
    const first = rawForwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return fallbackIp || null;
}
