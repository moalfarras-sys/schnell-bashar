export const adminSessionCookieName = "pdf_anlage_admin_session";
export const adminSessionMaxAgeSeconds = 60 * 60 * 8;
export const adminSessionCookiePath = "/";

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
}

export async function createAdminSessionToken() {
  const secret = sessionSecret();

  if (!secret) {
    return "local-dev";
  }

  const expiresAt = Math.floor(Date.now() / 1000) + adminSessionMaxAgeSeconds;
  const payload = `authenticated.${expiresAt}`;
  const signature = await signPayload(payload, secret);

  return `${payload}.${signature}`;
}

export async function verifyAdminSessionToken(token?: string) {
  const secret = sessionSecret();

  if (!secret) {
    return token === "local-dev";
  }

  if (!token) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [marker, expiresAtRaw, signature] = parts;
  if (marker !== "authenticated") {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = `${marker}.${expiresAtRaw}`;
  const expected = await signPayload(payload, secret);

  return constantTimeEqual(expected, signature);
}

async function signPayload(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return base64UrlEncode(new Uint8Array(signature));
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

