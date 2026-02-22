import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "ssu_admin";

function getSecret() {
  const raw = process.env.SESSION_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(raw);
}

export function adminCookieName() {
  return COOKIE_NAME;
}

export async function signAdminToken(payload: { email: string }) {
  const secret = getSecret();
  return await new SignJWT({ email: payload.email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAdminToken(token: string) {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret);
  if (payload.role !== "admin") throw new Error("Not admin");
  return payload as { email: string; role: "admin"; exp: number; iat: number };
}

/** Short-lived token for PDF access (e.g. after order submission). Valid 7 days. */
export async function signPdfAccessToken(publicId: string) {
  const secret = getSecret();
  return await new SignJWT({ publicId, purpose: "pdf" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyPdfAccessToken(token: string): Promise<{ publicId: string }> {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret);
  if (payload.purpose !== "pdf" || typeof payload.publicId !== "string") {
    throw new Error("Invalid PDF token");
  }
  return { publicId: payload.publicId };
}

