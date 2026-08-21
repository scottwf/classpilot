// @vitest-environment node
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  authenticateUser,
  countUsers,
  createUser,
  ensureBackfilledUser,
  getUserById,
  getUserByUsername,
  listUsers,
} from "./users-repository";
import { createClassPilotDatabase } from "./sqlite";

function temporaryDatabasePath() {
  return join(mkdtempSync(join(tmpdir(), "classpilot-test-")), "test.sqlite");
}

describe("users repository", () => {
  it("creates a user with a hashed password, not the plaintext", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    const user = createUser(db, { username: "teacher", password: "s3cret!" });

    expect(user.username).toBe("teacher");
    const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as {
      password_hash: string;
    };
    expect(row.password_hash).not.toContain("s3cret!");
    expect(row.password_hash.startsWith("scrypt:")).toBe(true);
  });

  it("finds a user by id and by username", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const created = createUser(db, { username: "teacher", password: "s3cret!" });

    expect(getUserById(db, created.id)?.username).toBe("teacher");
    expect(getUserByUsername(db, "teacher")?.id).toBe(created.id);
    expect(getUserByUsername(db, "nobody")).toBeUndefined();
  });

  it("authenticates by username and password together", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const created = createUser(db, { username: "teacher", password: "s3cret!" });

    expect(authenticateUser(db, "teacher", "s3cret!")?.id).toBe(created.id);
    expect(authenticateUser(db, "teacher", "wrong-password")).toBeUndefined();
    expect(authenticateUser(db, "nobody", "s3cret!")).toBeUndefined();
  });

  it("does not authenticate one account's password against a different account's username", () => {
    // The whole reason authenticateUser replaced the old password-only
    // lookup: two accounts sharing a password must never let a login for
    // one succeed as the other.
    const db = createClassPilotDatabase(temporaryDatabasePath());
    createUser(db, { username: "teacherA", password: "shared-password" });
    const teacherB = createUser(db, { username: "teacherB", password: "shared-password" });

    expect(authenticateUser(db, "teacherB", "shared-password")?.id).toBe(teacherB.id);
    expect(authenticateUser(db, "teacherC", "shared-password")).toBeUndefined();
  });

  it("lists every user without exposing password hashes", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    createUser(db, { username: "teacherA", password: "x" });
    createUser(db, { username: "teacherB", password: "y" });

    const users = listUsers(db);
    expect(users.map((user) => user.username)).toEqual(["teacherA", "teacherB"]);
    expect(users[0]).not.toHaveProperty("passwordHash");
    expect(users[0]).not.toHaveProperty("password_hash");
  });

  it("backfills exactly one user from the app password when none exist", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    expect(countUsers(db)).toBe(0);

    ensureBackfilledUser(db, "the-app-password", "teacher");

    expect(countUsers(db)).toBe(1);
    expect(authenticateUser(db, "teacher", "the-app-password")?.username).toBe("teacher");
  });

  it("does not create a second user if one already exists (idempotent)", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    createUser(db, { username: "existing", password: "already-here" });

    ensureBackfilledUser(db, "the-app-password", "teacher");

    expect(countUsers(db)).toBe(1);
    expect(authenticateUser(db, "teacher", "the-app-password")).toBeUndefined();
    expect(authenticateUser(db, "existing", "already-here")?.username).toBe("existing");
  });
});
