import { NextResponse, type NextRequest } from "next/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { authenticateUser } from "@/src/lib/db/users-repository";
import { setAuthCookie } from "@/src/lib/auth/server";
import {
  clearLoginAttempts,
  isLoginLocked,
  recordFailedLogin,
} from "@/src/lib/auth/login-rate-limit";

/**
 * A plain Route Handler, not a Server Action -- login needs the browser to
 * do a real top-level POST navigation. iOS standalone home-screen web apps
 * don't reliably persist cookies set on a fetch/XHR response (WebKit bug
 * 194512): only a cookie set on an actual navigation response survives the
 * app being backgrounded/evicted, which iOS does aggressively for PWAs.
 * Server Actions are always invoked via fetch even from a plain <form>, so
 * login has to bypass that path with a form posting straight here instead.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const db = getClassPilotDatabase();

  if (isLoginLocked(db, username)) {
    return NextResponse.redirect(new URL("/login?error=locked", request.url), 303);
  }

  const user = authenticateUser(db, username, password);

  if (!user) {
    recordFailedLogin(db, username);
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  clearLoginAttempts(db, username);
  await setAuthCookie(user.id);

  return NextResponse.redirect(new URL("/", request.url), 303);
}
