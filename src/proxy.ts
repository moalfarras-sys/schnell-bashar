import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { hasPermission, requiredPermissionForPath } from "@/server/auth/admin-permissions";

function withAdminNoCache(res: NextResponse) {
  res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  if (host === "www.schnellsicherumzug.de") {
    const url = req.nextUrl.clone();
    url.host = "schnellsicherumzug.de";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  if (
    pathname !== "/maintenance.html" &&
    !pathname.startsWith("/_next/") &&
    pathname !== "/favicon.ico"
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/maintenance.html";
    url.search = "";
    return NextResponse.rewrite(url);
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Allow public admin PWA assets and login page
  if (
    pathname === "/admin/manifest.webmanifest" ||
    pathname === "/admin/sw.js" ||
    pathname.startsWith("/admin/pwa-icon-")
  ) {
    return NextResponse.next();
  }

  // Allow login page
  if (pathname.startsWith("/admin/login")) return withAdminNoCache(NextResponse.next());

  const token = req.cookies.get(adminCookieName())?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return withAdminNoCache(NextResponse.redirect(url));
  }

  try {
    const claims = await verifyAdminToken(token);
    const requiredPermission = requiredPermissionForPath(pathname);
    if (!hasPermission(claims.roles, claims.permissions, requiredPermission)) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      url.searchParams.set("denied", "1");
      return withAdminNoCache(NextResponse.redirect(url));
    }
    return withAdminNoCache(NextResponse.next());
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return withAdminNoCache(NextResponse.redirect(url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
