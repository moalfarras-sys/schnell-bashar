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
type LoginClaims = NonNullable<Awaited<ReturnType<typeof getAdminClaimsByEmail>>>;

async function getEnvAdminClaims(email: string, password: string) {
  const envEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const plain = String(process.env.ADMIN_PASSWORD ?? "").trim();
  const hash = String(process.env.ADMIN_PASSWORD_HASH ?? "").trim();

  if (!envEmail || email !== envEmail) return null;
  const passwordOk =
    (hash && /^\$2[aby]\$/.test(hash) && (await bcrypt.compare(password, hash))) ||
    (plain && password === plain);

  if (!passwordOk) return null;

  return {
    user: {
      id: "env-owner",
      email: envEmail,
      isActive: true,
      lockedUntil: null as Date | null,
      passwordHash: hash || plain,
    },
    roles: ["owner"],
    permissions: [] as string[],
  } as LoginClaims;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  let claims: LoginClaims | null = await getEnvAdminClaims(email, password);
  let usedEnvFallback = Boolean(claims);
  const isPrimaryEnvAdmin = email === (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!claims && isPrimaryEnvAdmin) return { error: "Falsche Zugangsdaten." };
  try {
    if (!claims) {
      await ensureBootstrapAdminFromEnv();
      claims = await getAdminClaimsByEmail(email);
    }
  } catch (error) {
    console.error("[admin/login] database auth failed, trying env fallback", error);
    claims = await getEnvAdminClaims(email, password);
    usedEnvFallback = Boolean(claims);
  }

  if (!claims?.user) return { error: "Falsche Zugangsdaten." };
  if (!claims.user.isActive) return { error: "Konto ist deaktiviert." };
  if (claims.user.lockedUntil && claims.user.lockedUntil > new Date()) {
    return { error: "Zu viele Fehlversuche. Bitte später erneut versuchen." };
  }

  const ok = usedEnvFallback ? true : await bcrypt.compare(password, claims.user.passwordHash);
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

  if (!usedEnvFallback) {
    await markLoginSuccess(claims.user.id);
  }

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

  if (!usedEnvFallback) {
    await writeAuditLog({
      actorUserId: claims.user.id,
      action: "auth.login_success",
      entityType: "AdminUser",
      entityId: claims.user.id,
      after: { email: claims.user.email },
      path: "/admin/login",
    });
  }

  redirect(next.startsWith("/admin") ? next : "/admin");
}
