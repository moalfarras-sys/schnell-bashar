import { cookies } from "next/headers";

import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { hasPermission } from "@/server/auth/admin-permissions";

export async function requireAdminSession(): Promise<{ ok: true } | { ok: false }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return { ok: false };

  try {
    await verifyAdminToken(token);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function requireAdminPermission(permission: string): Promise<{ ok: true } | { ok: false }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return { ok: false };

  try {
    const claims = await verifyAdminToken(token);
    const allowed = hasPermission(claims.roles, claims.permissions, permission);
    return allowed ? { ok: true } : { ok: false };
  } catch {
    return { ok: false };
  }
}

