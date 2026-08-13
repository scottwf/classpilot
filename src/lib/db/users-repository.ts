import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "@/src/lib/auth/password";
import type { ClassPilotDatabase } from "./sqlite";

export type User = {
  id: string;
  username: string;
  createdAt: string;
};

type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
};

function mapUser(row: UserRow): User {
  return { id: row.id, username: row.username, createdAt: row.created_at };
}

export function countUsers(db: ClassPilotDatabase): number {
  const row = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  return row.count;
}

export function getUserById(db: ClassPilotDatabase, id: string): User | undefined {
  const row = db
    .prepare("SELECT id, username, password_hash, created_at FROM users WHERE id = ?")
    .get(id) as UserRow | undefined;

  return row ? mapUser(row) : undefined;
}

// Only for the boot-time backfill migration in classpilot-db.ts (attributing
// pre-multi-user data to *a* user) -- everywhere else, the current user
// comes from the authenticated session (getCurrentUserId()), never this.
export function getSoleUser(db: ClassPilotDatabase): User | undefined {
  const row = db
    .prepare("SELECT id, username, password_hash, created_at FROM users ORDER BY rowid LIMIT 1")
    .get() as UserRow | undefined;

  return row ? mapUser(row) : undefined;
}

/** Usernames + creation dates only, for the account-management UI (issue
 * #21 Phase 3) — never password hashes. */
export function listUsers(db: ClassPilotDatabase): User[] {
  const rows = db
    .prepare("SELECT id, username, password_hash, created_at FROM users ORDER BY created_at")
    .all() as UserRow[];

  return rows.map(mapUser);
}

export function getUserByUsername(db: ClassPilotDatabase, username: string): User | undefined {
  const row = db
    .prepare("SELECT id, username, password_hash, created_at FROM users WHERE username = ?")
    .get(username) as UserRow | undefined;

  return row ? mapUser(row) : undefined;
}

export function createUser(
  db: ClassPilotDatabase,
  input: { username: string; password: string },
): User {
  const id = `user-${randomUUID()}`;
  const createdAt = new Date().toISOString();

  db.prepare(
    "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
  ).run(id, input.username, hashPassword(input.password), createdAt);

  return { id, username: input.username, createdAt };
}

/**
 * Real per-account login (issue #21 Phase 3): looks the account up by
 * username first, then verifies the password against that specific
 * account's hash. Replaces the Phase 1/2 password-only
 * authenticateByPassword (which matched against every user's hash) now
 * that a second account can actually exist — matching by password alone
 * was always ambiguous if two accounts ever shared a password (whichever
 * row came first would silently win), which stops being a theoretical
 * concern once account creation is real.
 */
export function authenticateUser(
  db: ClassPilotDatabase,
  username: string,
  password: string,
): User | undefined {
  const row = db
    .prepare("SELECT id, username, password_hash, created_at FROM users WHERE username = ?")
    .get(username) as UserRow | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    return undefined;
  }

  return mapUser(row);
}

/**
 * Backfill migration: an existing deployment has zero `users` rows. Create
 * exactly one user from the current shared CLASSPILOT_APP_PASSWORD so the
 * existing teacher's login keeps working with zero manual steps. No-ops
 * once any user exists — idempotent, like the rest of this project's
 * migrations (see backfillSchoolYearScoping in sqlite.ts for the same
 * shape).
 */
export function ensureBackfilledUser(
  db: ClassPilotDatabase,
  appPassword: string,
  username: string,
): void {
  if (countUsers(db) > 0) {
    return;
  }

  createUser(db, { username, password: appPassword });
}
