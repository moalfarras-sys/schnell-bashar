import { cookies } from "next/headers";

import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { hasPermission } from "@/server/auth/admin-permissions";

export async function requireAdminPermission(permission: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return null;

  try {
    const claims = await verifyAdminToken(token);
    return hasPermission(claims.roles, claims.permissions, permission) ? claims : null;
  } catch {
    return null;
  }
}

