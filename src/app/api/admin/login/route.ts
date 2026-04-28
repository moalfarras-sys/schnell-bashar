import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { writeAuditLog } from "@/server/audit/log";
import { adminCookieName, signAdminToken } from "@/server/auth/admin-session";
import {
  ensureBootstrapAdminFromEnv,
  getAdminClaimsByEmail,
  markLoginFailure,
  markLoginSuccess,
} from "@/server/auth/admin-users";

type LoginClaims = NonNullable<Awaited<ReturnType<typeof getAdminClaimsByEmail>>>;

function cleanEnvValue(value: string | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

async function getEnvAdminClaims(email: string, password: string) {
  const envEmail = cleanEnvValue(process.env.ADMIN_EMAIL).toLowerCase();
  const plain = cleanEnvValue(process.env.ADMIN_PASSWORD);
  const hash = cleanEnvValue(process.env.ADMIN_PASSWORD_HASH);

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

async function readLoginBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      email: String(body.email ?? "").trim().toLowerCase(),
      password: String(body.password ?? ""),
      next: String(body.next ?? "/admin"),
    };
  }

  const formData = await request.formData();
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? "/admin"),
  };
}

export async function POST(request: NextRequest) {
  const { email, password, next } = await readLoginBody(request);
  const safeNext = next.startsWith("/admin") ? next : "/admin";

  let claims: LoginClaims | null = await getEnvAdminClaims(email, password);
  const usedEnvFallback = Boolean(claims);
  const isPrimaryEnvAdmin = email === cleanEnvValue(process.env.ADMIN_EMAIL).toLowerCase();

  if (!claims && isPrimaryEnvAdmin) {
    return NextResponse.json({ ok: false, error: "Falsche Zugangsdaten." }, { status: 401 });
  }

  try {
    if (!claims) {
      await ensureBootstrapAdminFromEnv();
      claims = await getAdminClaimsByEmail(email);
    }
  } catch (error) {
    console.error("[admin/login-api] database auth failed, trying env fallback", error);
    claims = await getEnvAdminClaims(email, password);
  }

  if (!claims?.user) {
    return NextResponse.json({ ok: false, error: "Falsche Zugangsdaten." }, { status: 401 });
  }
  if (!claims.user.isActive) {
    return NextResponse.json({ ok: false, error: "Konto ist deaktiviert." }, { status: 403 });
  }
  if (claims.user.lockedUntil && claims.user.lockedUntil > new Date()) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Fehlversuche. Bitte später erneut versuchen." },
      { status: 423 },
    );
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
    return NextResponse.json({ ok: false, error: "Falsche Zugangsdaten." }, { status: 401 });
  }

  if (!usedEnvFallback) {
    await markLoginSuccess(claims.user.id);
    await writeAuditLog({
      actorUserId: claims.user.id,
      action: "auth.login_success",
      entityType: "AdminUser",
      entityId: claims.user.id,
      after: { email: claims.user.email },
      path: "/admin/login",
    });
  }

  const token = await signAdminToken({
    uid: claims.user.id,
    email: claims.user.email,
    roles: claims.roles,
    permissions: claims.permissions,
  });

  const response = NextResponse.json({ ok: true, next: safeNext });
  response.cookies.set(adminCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
