import { createHash, timingSafeEqual } from "node:crypto";

export const authCookieName = "classpilot_session";

const devSecret = "classpilot-local-dev-secret";
const devPassword = "classpilot";
const devCalendarToken = "classpilot-calendar-dev-token";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getAuthSecret(): string {
  const secret =
    process.env.CLASSPILOT_AUTH_SECRET ?? process.env.CLASSPILOT_APP_PASSWORD;

  if (secret) {
    return secret;
  }

  if (isProduction()) {
    throw new Error(
      "CLASSPILOT_AUTH_SECRET (or CLASSPILOT_APP_PASSWORD) must be set in production.",
    );
  }

  return devSecret;
}

export function getAppPassword(): string {
  const password = process.env.CLASSPILOT_APP_PASSWORD;

  if (password) {
    return password;
  }

  if (isProduction()) {
    throw new Error("CLASSPILOT_APP_PASSWORD must be set in production.");
  }

  return devPassword;
}

export function verifyAppPassword(candidate: string): boolean {
  const expected = createHash("sha256").update(getAppPassword()).digest();
  const actual = createHash("sha256").update(candidate).digest();

  return timingSafeEqual(expected, actual);
}

// Separate from the login password: calendar clients subscribing by URL
// can't send a custom header or maintain a session cookie, so this token
// travels in the query string instead. Keeping it distinct means the URL
// can be shared (e.g. pasted into a calendar app) without handing out the
// actual login password.
export function getCalendarToken(): string {
  const token = process.env.CLASSPILOT_CALENDAR_TOKEN;

  if (token) {
    return token;
  }

  if (isProduction()) {
    throw new Error("CLASSPILOT_CALENDAR_TOKEN must be set in production.");
  }

  return devCalendarToken;
}

export function verifyCalendarToken(candidate: string): boolean {
  const expected = createHash("sha256").update(getCalendarToken()).digest();
  const actual = createHash("sha256").update(candidate).digest();

  return timingSafeEqual(expected, actual);
}
