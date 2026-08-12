import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const keyLength = 64;

/**
 * Real per-user password hashing (scrypt, random salt) — replaces the
 * SHA-256-compare pattern in secrets.ts, which was fine for one shared
 * secret but not for per-user credential storage (no salt, fast hash).
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, keyLength);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");

  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
