import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/auth";
import { appPath } from "@/lib/routes";

export async function isAdminAuthenticated() {
  if (!process.env.ADMIN_PASSWORD) {
    return true;
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(adminSessionCookieName)?.value;

  return verifyAdminSessionToken(session);
}

export async function requireAdminPage() {
  if (await isAdminAuthenticated()) {
    return;
  }

  redirect(appPath("/login"));
}

export async function requireAdminApi() {
  if (await isAdminAuthenticated()) {
    return null;
  }

  return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
}

