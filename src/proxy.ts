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

/**
 * ⛑️  GUARD: This proxy MUST never crash the public site.
 *    - Non-admin routes always pass through immediately.
 *    - The outer try/catch is a safety net: if *anything* throws
 *      (bad import, DB timeout, config error, etc.) the request
 *      falls through to Next.js so the visitor sees the page, not a 500.
 */
export async function proxy(req: NextRequest) {
  try {
    const host = req.headers.get("host") || "";
    const { pathname } = req.nextUrl;

    // Redirect www → apex
    if (host === "www.schnellsicherumzug.de") {
      const url = req.nextUrl.clone();
      url.host = "schnellsicherumzug.de";
      url.protocol = "https:";
      return NextResponse.redirect(url, 308);
    }

    // ── Public routes: let everything that is NOT /admin through ──
    if (pathname.startsWith("/pdf-anlage") || !pathname.startsWith("/admin")) {
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

    // ── Admin auth gate ──
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
  } catch (error) {
    // ⛑️ SAFETY NET: never let a proxy bug take down the whole site
    console.error("[proxy] unexpected error — falling through safely", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
