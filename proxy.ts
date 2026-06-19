import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authCookieName, getAuthSecret } from "@/src/lib/auth/secrets";
import { verifySessionToken } from "@/src/lib/auth/session";

// Defense-in-depth backstop. Every page and server action still calls
// requireAuth(); this guards any route that forgets to. Runs on the Node.js
// runtime (the default for proxy in Next.js 16), so it reuses the same HMAC
// session verification as the rest of the app.

const publicPaths = new Set(["/login"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(authCookieName)?.value;

  if (verifySessionToken({ secret: getAuthSecret(), token })) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)",
  ],
};
