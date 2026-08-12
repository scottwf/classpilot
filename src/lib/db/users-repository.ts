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
 * Phase 1/2 login (issue #21): only one account can exist yet, so the
 * login form only asks for a password, no username field. Matches against
 * every user's hash (in practice exactly one row) rather than requiring a
 * username lookup — Phase 3 (account creation) adds a username field to
 * the login form once a second account can actually exist.
 */
export function authenticateByPassword(
  db: ClassPilotDatabase,
  password: string,
): User | undefined {
  const rows = db
    .prepare("SELECT id, username, password_hash, created_at FROM users")
    .all() as UserRow[];
  const match = rows.find((row) => verifyPassword(password, row.password_hash));

  return match ? mapUser(match) : undefined;
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
