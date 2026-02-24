"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { writeAuditLog } from "@/server/audit/log";

export async function logoutAction() {
  const store = await cookies();
  const token = store.get(adminCookieName())?.value;
  if (token) {
    try {
      const claims = await verifyAdminToken(token);
      await writeAuditLog({
        actorUserId: claims.uid,
        action: "auth.logout",
        entityType: "AdminUser",
        entityId: claims.uid,
        path: "/admin",
      });
    } catch {
      // ignore invalid tokens during logout
    }
  }
  store.set(adminCookieName(), "", { path: "/", expires: new Date(0) });
  redirect("/admin/login");
}

