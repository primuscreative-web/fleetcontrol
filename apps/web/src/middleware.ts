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

  // A sessão Supabase é validada no SessionProvider através do bearer token.
  // O middleware não inspeciona localStorage nem cookies do domínio da API.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
