import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

// NOTE: proxy.ts must only use lightweight, edge-compatible code.
// It CANNOT import prisma or call DB. DB verification happens in route handlers / server components.
// The proxy handles redirects based on the signed cookie; routes/APIs do live DB role verification.

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;

  const session = rawToken ? verifySessionToken(rawToken) : null;
  const isAuthenticated = session !== null;
  const isAdmin = session?.role === "ADMIN";

  // --- Protect /dashboard (USER and ADMIN may access) ---
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // --- Protect /admin (ADMIN only) ---
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (!isAdmin) {
      // Authenticated but not admin — redirect to user dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // --- Protect /api/user/* (require any authenticated session) ---
  if (pathname.startsWith("/api/user/")) {
    if (!isAuthenticated) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }
    return NextResponse.next();
  }

  // --- Protect /api/admin/* (require ADMIN role in cookie — full DB check happens in handler) ---
  if (pathname.startsWith("/api/admin/")) {
    if (!isAuthenticated) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }
    if (!isAdmin) {
      return Response.json({ error: "Administrators only." }, { status: 403 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/user/:path*",
    "/api/admin/:path*",
  ],
};
