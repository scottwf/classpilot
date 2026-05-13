import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { shouldUseSecureCookies } from "./cookie-policy";
import { createSessionToken, verifySessionToken } from "./session";

export const authCookieName = "classpilot_session";

export function getAuthSecret(): string {
  return (
    process.env.CLASSPILOT_AUTH_SECRET ??
    process.env.CLASSPILOT_APP_PASSWORD ??
    "classpilot-local-dev-secret"
  );
}

export function getAppPassword(): string {
  return process.env.CLASSPILOT_APP_PASSWORD ?? "classpilot";
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;

  return verifySessionToken({
    secret: getAuthSecret(),
    token,
  });
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

export async function setAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(authCookieName, createSessionToken({ secret: getAuthSecret() }), {
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
