"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminCookieName } from "@/server/auth/admin-session";

export async function logoutAction() {
  const store = await cookies();
  store.set(adminCookieName(), "", { path: "/", expires: new Date(0) });
  redirect("/admin/login");
}

