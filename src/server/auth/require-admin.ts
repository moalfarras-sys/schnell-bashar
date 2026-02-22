import { cookies } from "next/headers";

import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";

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

