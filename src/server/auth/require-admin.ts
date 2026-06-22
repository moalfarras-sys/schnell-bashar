import { cookies } from "next/headers";

import { adminCookieName, type AdminTokenClaims, verifyAdminToken } from "@/server/auth/admin-session";
import { hasPermission } from "@/server/auth/admin-permissions";
import { ensureBootstrapAdminFromEnv, getAdminClaimsByEmail } from "@/server/auth/admin-users";

function looksLikeCuid(value: string | undefined) {
  return Boolean(value && /^c[a-z0-9]{8,}$/i.test(value));
}

async function normalizeClaims(claims: AdminTokenClaims) {
  if (looksLikeCuid(claims.uid)) return claims;

  try {
    await ensureBootstrapAdminFromEnv();
    const dbClaims = await getAdminClaimsByEmail(claims.email);
    if (dbClaims?.user?.id) {
      return {
        ...claims,
        uid: dbClaims.user.id,
        roles: dbClaims.roles,
        permissions: dbClaims.permissions,
      };
    }
  } catch (error) {
    console.error("[admin-auth] failed to normalize admin claims", error);
  }

  return { ...claims, uid: undefined };
}

export async function requireAdminSession(): Promise<{ ok: true } | { ok: false }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return { ok: false };

  try {
    await normalizeClaims(await verifyAdminToken(token));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function getAdminSessionClaims(): Promise<AdminTokenClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return null;

  try {
    return await normalizeClaims(await verifyAdminToken(token));
  } catch {
    return null;
  }
}

export async function requireAdminPermission(permission: string): Promise<{ ok: true } | { ok: false }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return { ok: false };

  try {
    const claims = await normalizeClaims(await verifyAdminToken(token));
    const allowed = hasPermission(claims.roles, claims.permissions, permission);
    return allowed ? { ok: true } : { ok: false };
  } catch {
    return { ok: false };
  }
}
