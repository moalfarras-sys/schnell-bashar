import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "ssu_admin";

function getSecret() {
  const raw = process.env.SESSION_SECRET?.trim();
  if (!raw) {
    throw new Error("SESSION_SECRET is required. Set SESSION_SECRET in environment variables.");
  }
  return new TextEncoder().encode(raw);
}

export function adminCookieName() {
  return COOKIE_NAME;
}

export type AdminTokenClaims = {
  uid?: string;
  email: string;
  role: "admin";
  roles: string[];
  permissions: string[];
  exp: number;
  iat: number;
};

export async function signAdminToken(payload: {
  uid?: string;
  email: string;
  roles?: string[];
  permissions?: string[];
}) {
  const secret = getSecret();
  return await new SignJWT({
    uid: payload.uid,
    email: payload.email,
    role: "admin",
    roles: payload.roles ?? ["owner"],
    permissions: payload.permissions ?? [],
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAdminToken(token: string) {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret);
  if (payload.role !== "admin") throw new Error("Not admin");
  return {
    uid: typeof payload.uid === "string" ? payload.uid : undefined,
    email: String(payload.email || ""),
    role: "admin",
    roles: Array.isArray(payload.roles) ? payload.roles.map(String) : [],
    permissions: Array.isArray(payload.permissions) ? payload.permissions.map(String) : [],
    exp: Number(payload.exp),
    iat: Number(payload.iat),
  } as AdminTokenClaims;
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

