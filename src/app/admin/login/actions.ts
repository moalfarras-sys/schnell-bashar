"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminCookieName, signAdminToken } from "@/server/auth/admin-session";

export type LoginState = { error?: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  const expectedEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (expectedEmail && email !== expectedEmail) {
    return { error: "Falsche Zugangsdaten." };
  }

  const hash = (process.env.ADMIN_PASSWORD_HASH ?? "").trim();
  const plain = String(process.env.ADMIN_PASSWORD ?? "");

  const ok = hash
    ? await bcrypt.compare(password, hash)
    : plain
      ? password === plain
      : false;

  if (!ok) return { error: "Falsche Zugangsdaten." };

  const token = await signAdminToken({ email: email || expectedEmail || "admin" });
  const store = await cookies();
  store.set(adminCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  redirect(next.startsWith("/admin") ? next : "/admin");
}

