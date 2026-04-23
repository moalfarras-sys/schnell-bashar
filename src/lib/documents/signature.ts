import { createHash, randomBytes } from "node:crypto";

import { DEFAULT_SIGNING_LINK_TTL_HOURS } from "@/lib/documents/constants";

function ttlHours() {
  const raw = Number(process.env.SIGNING_LINK_TTL_HOURS ?? DEFAULT_SIGNING_LINK_TTL_HOURS);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_SIGNING_LINK_TTL_HOURS;
  return Math.floor(raw);
}

export function hashSigningToken(token: string) {
  const secret = process.env.SIGNING_TOKEN_SECRET?.trim();
  const base = secret ? `${secret}:${token}` : token;
  return createHash("sha256").update(base).digest("hex");
}

export function issueSigningToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashSigningToken(token),
    expiresAt: new Date(Date.now() + ttlHours() * 60 * 60 * 1000),
  };
}

export function createDocumentHash(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function buildSigningUrl(token: string) {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://schnellsicherumzug.de"
  ).replace(/\/+$/, "");
  return `${baseUrl}/dokumente/unterschrift/${token}`;
}
