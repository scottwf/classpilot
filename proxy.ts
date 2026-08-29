import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authCookieName, getAuthSecret } from "@/src/lib/auth/secrets";
import { verifySessionToken } from "@/src/lib/auth/session";

// Defense-in-depth backstop. Every page and server action still calls
// requireAuth(); this guards any route that forgets to. Runs on the Node.js
// runtime (the default for proxy in Next.js 16), so it reuses the same HMAC
// session verification as the rest of the app.
//
// /calendar/feed.ics is exempt from the session-cookie check because it has
// its own auth: a query-string token verified inside the route handler
// (see getCalendarToken()/verifyCalendarToken() in src/lib/auth/secrets.ts).
// Calendar apps subscribing by URL can't hold a session cookie or follow a
// login redirect.
//
// /offline is exempt so the service worker (public/sw.js) can reliably
// precache it regardless of session state, and so it renders correctly when
// served from cache with no network round-trip at all (auth can't run then
// anyway — it's a static, DB-free page with no sensitive content).
//
// /login/submit is exempt because it's the login POST itself -- by
// definition there's no session cookie yet. It's a plain Route Handler
// (not a Server Action) so iOS standalone PWAs reliably persist the
// resulting Set-Cookie -- see app/login/submit/route.ts.
const publicPaths = new Set([
  "/login",
  "/login/submit",
  "/calendar/feed.ics",
  "/offline",
]);

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
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon-.*\\.png|apple-touch-icon.png).*)",
  ],
};
