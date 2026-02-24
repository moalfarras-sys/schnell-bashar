"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminCookieName, signAdminToken } from "@/server/auth/admin-session";
import {
  ensureBootstrapAdminFromEnv,
  getAdminClaimsByEmail,
  markLoginFailure,
  markLoginSuccess,
} from "@/server/auth/admin-users";
import { writeAuditLog } from "@/server/audit/log";

export type LoginState = { error?: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  await ensureBootstrapAdminFromEnv();
  const claims = await getAdminClaimsByEmail(email);

  if (!claims?.user) return { error: "Falsche Zugangsdaten." };
  if (!claims.user.isActive) return { error: "Konto ist deaktiviert." };
  if (claims.user.lockedUntil && claims.user.lockedUntil > new Date()) {
    return { error: "Zu viele Fehlversuche. Bitte später erneut versuchen." };
  }

  const ok = await bcrypt.compare(password, claims.user.passwordHash);
  if (!ok) {
    await markLoginFailure(claims.user.id);
    await writeAuditLog({
      actorUserId: claims.user.id,
      action: "auth.login_failed",
      entityType: "AdminUser",
      entityId: claims.user.id,
      after: { email },
      path: "/admin/login",
    });
    return { error: "Falsche Zugangsdaten." };
  }

  await markLoginSuccess(claims.user.id);

  const token = await signAdminToken({
    uid: claims.user.id,
    email: claims.user.email,
    roles: claims.roles,
    permissions: claims.permissions,
  });
  const store = await cookies();
  store.set(adminCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  await writeAuditLog({
    actorUserId: claims.user.id,
    action: "auth.login_success",
    entityType: "AdminUser",
    entityId: claims.user.id,
    after: { email: claims.user.email },
    path: "/admin/login",
  });

  redirect(next.startsWith("/admin") ? next : "/admin");
}

