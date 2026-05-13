import { createHmac, timingSafeEqual } from "node:crypto";

const defaultTtlMs = 1000 * 60 * 60 * 24 * 14;

type CreateSessionTokenOptions = {
  now?: number;
  secret: string;
  ttlMs?: number;
};

type VerifySessionTokenOptions = {
  now?: number;
  secret: string;
  token?: string;
};

export function createSessionToken({
  now = Date.now(),
  secret,
  ttlMs = defaultTtlMs,
}: CreateSessionTokenOptions): string {
  const payload = `auth.${now + ttlMs}`;
  const signature = sign(payload, secret);

  return `${payload}.${signature}`;
}

export function verifySessionToken({
  now = Date.now(),
  secret,
  token,
}: VerifySessionTokenOptions): boolean {
  if (!token) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 3 || parts[0] !== "auth") {
    return false;
  }

  const payload = `${parts[0]}.${parts[1]}`;
  const expiresAt = Number(parts[1]);
  const signature = parts[2];

  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    return false;
  }

  return signaturesMatch(signature, sign(payload, secret));
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
