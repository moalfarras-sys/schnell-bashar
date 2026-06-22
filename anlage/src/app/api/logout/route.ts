import { NextResponse } from "next/server";
import { adminSessionCookieName, adminSessionCookiePath } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete({
    name: adminSessionCookieName,
    path: adminSessionCookiePath
  });
  return response;
}
