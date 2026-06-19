import { createHash, timingSafeEqual } from "node:crypto";

export const authCookieName = "classpilot_session";

const devSecret = "classpilot-local-dev-secret";
const devPassword = "classpilot";

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
