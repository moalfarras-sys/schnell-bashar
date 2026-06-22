import { NextResponse } from "next/server";
import {
  adminSessionCookieName,
  adminSessionCookiePath,
  adminSessionMaxAgeSeconds,
  createAdminSessionToken
} from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = (await request.json().catch(() => ({}))) as {
    password?: string;
  };
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) {
    const response = NextResponse.json({ ok: true, mode: "local-dev" });
    response.cookies.set(adminSessionCookieName, await createAdminSessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: adminSessionMaxAgeSeconds,
      path: adminSessionCookiePath
    });
    return response;
  }

  if (!password || password !== expectedPassword) {
    return NextResponse.json({ error: "Ungültiges Passwort." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminSessionCookieName, await createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: adminSessionMaxAgeSeconds,
    path: adminSessionCookiePath
  });
  return response;
}
