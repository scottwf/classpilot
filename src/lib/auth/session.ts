import { createHmac, timingSafeEqual } from "node:crypto";

const defaultTtlMs = 1000 * 60 * 60 * 24 * 14;

type CreateSessionTokenOptions = {
  now?: number;
  secret: string;
  ttlMs?: number;
  userId: string;
};

type VerifySessionTokenOptions = {
  now?: number;
  secret: string;
  token?: string;
};

export type SessionTokenPayload = {
  userId: string;
  expiresAt: number;
};

// Payload shape: `auth.<userId>.<expiresAt>` — identity-bound (issue #21
// Phase 1), not just a signed boolean like the original single-shared-
// password version. userId is always a `user-<uuid>` (see
// users-repository.ts), which never contains a `.`, so splitting the token
// on `.` is safe.
export function createSessionToken({
  now = Date.now(),
  secret,
  ttlMs = defaultTtlMs,
  userId,
}: CreateSessionTokenOptions): string {
  const payload = `auth.${userId}.${now + ttlMs}`;
  const signature = sign(payload, secret);

  return `${payload}.${signature}`;
}

export function verifySessionToken({
  now = Date.now(),
  secret,
  token,
}: VerifySessionTokenOptions): SessionTokenPayload | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 4 || parts[0] !== "auth") {
    return null;
  }

  const [, userId, expiresAtRaw, signature] = parts;
  const payload = `auth.${userId}.${expiresAtRaw}`;
  const expiresAt = Number(expiresAtRaw);

  if (!userId || !Number.isFinite(expiresAt) || expiresAt <= now) {
    return null;
  }

  if (!signaturesMatch(signature, sign(payload, secret))) {
    return null;
  }

  return { userId, expiresAt };
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function signaturesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
