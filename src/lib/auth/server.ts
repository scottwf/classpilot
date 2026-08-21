import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { shouldUseSecureCookies } from "./cookie-policy";
import { authCookieName, getAppPassword, getAppUsername, getAuthSecret } from "./secrets";
import { createSessionToken, verifySessionToken, type SessionTokenPayload } from "./session";

export { authCookieName, getAppPassword, getAppUsername, getAuthSecret };

async function getSessionPayload(): Promise<SessionTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;

  return verifySessionToken({
    secret: getAuthSecret(),
    token,
  });
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSessionPayload()) !== null;
}

export async function getCurrentUserId(): Promise<string | null> {
  return (await getSessionPayload())?.userId ?? null;
}

/** Redirects to /login if not authenticated; otherwise returns the current user's id. */
export async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  return userId;
}

export async function setAuthCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(authCookieName, createSessionToken({ secret: getAuthSecret(), userId }), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureCookies({
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      cookieSecure: process.env.CLASSPILOT_COOKIE_SECURE,
      nodeEnv: process.env.NODE_ENV,
    }),
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(authCookieName);
}
