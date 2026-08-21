import { randomUUID } from "node:crypto";
import type { ClassPilotDatabase } from "@/src/lib/db/sqlite";

// Issue #21 security checklist: "Rate limiting (or at least a delay/lockout)
// on login attempts -- doesn't exist today at all." Locks out a *username*
// (not an IP -- there's no reverse-proxy-forwarded IP plumbed through here,
// and username-scoped lockout already stops credential stuffing against a
// known account) after too many failed attempts in a sliding window.
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

function windowStartIso(): string {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
}

/** True if this username has hit the failed-attempt ceiling within the window. */
export function isLoginLocked(db: ClassPilotDatabase, username: string): boolean {
  const row = db
    .prepare(
      "SELECT COUNT(*) AS count FROM login_attempts WHERE username = ? AND created_at > ?",
    )
    .get(username, windowStartIso()) as { count: number };

  return row.count >= MAX_ATTEMPTS;
}

/** Records a failed attempt and prunes this username's attempts older than the window. */
export function recordFailedLogin(db: ClassPilotDatabase, username: string): void {
  db.prepare("DELETE FROM login_attempts WHERE username = ? AND created_at <= ?").run(
    username,
    windowStartIso(),
  );

  db.prepare(
    "INSERT INTO login_attempts (id, username, created_at) VALUES (?, ?, ?)",
  ).run(`login-attempt-${randomUUID()}`, username, new Date().toISOString());
}

/** Clears a username's failed-attempt history, e.g. after a successful login. */
export function clearLoginAttempts(db: ClassPilotDatabase, username: string): void {
  db.prepare("DELETE FROM login_attempts WHERE username = ?").run(username);
}
