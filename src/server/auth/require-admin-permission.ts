import { cookies } from "next/headers";

import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { hasPermission } from "@/server/auth/admin-permissions";
import { ensureBootstrapAdminFromEnv, getAdminClaimsByEmail } from "@/server/auth/admin-users";

function looksLikeCuid(value: string | undefined) {
  return Boolean(value && /^c[a-z0-9]{8,}$/i.test(value));
}

export async function requireAdminPermission(permission: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return null;

  try {
    const claims = await verifyAdminToken(token);
    if (!looksLikeCuid(claims.uid)) {
      await ensureBootstrapAdminFromEnv();
      const dbClaims = await getAdminClaimsByEmail(claims.email);
      if (dbClaims?.user?.id) {
        claims.uid = dbClaims.user.id;
        claims.roles = dbClaims.roles;
        claims.permissions = dbClaims.permissions;
      } else {
        claims.uid = undefined;
      }
    }
    return hasPermission(claims.roles, claims.permissions, permission) ? claims : null;
  } catch {
    return null;
  }
}
