import { NextResponse, type NextRequest } from "next/server";

const publicPaths = new Set([
  "/login",
  "/reset-password",
  "/maintenance",
  "/access-denied",
  "/manifest.webmanifest",
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.has(pathname) ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icon")
  ) {
    return NextResponse.next();
  }

  if (
    !request.cookies.get("fleetcontrol_access_token") &&
    !request.cookies.get("fleetcontrol_refresh_token")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
