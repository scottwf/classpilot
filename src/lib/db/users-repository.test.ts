// @vitest-environment node
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  authenticateByPassword,
  countUsers,
  createUser,
  ensureBackfilledUser,
  getUserById,
  getUserByUsername,
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

  it("authenticates by password against any existing user", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const created = createUser(db, { username: "teacher", password: "s3cret!" });

    expect(authenticateByPassword(db, "s3cret!")?.id).toBe(created.id);
    expect(authenticateByPassword(db, "wrong-password")).toBeUndefined();
  });

  it("backfills exactly one user from the app password when none exist", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    expect(countUsers(db)).toBe(0);

    ensureBackfilledUser(db, "the-app-password", "teacher");

    expect(countUsers(db)).toBe(1);
    expect(authenticateByPassword(db, "the-app-password")?.username).toBe("teacher");
  });

  it("does not create a second user if one already exists (idempotent)", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    createUser(db, { username: "existing", password: "already-here" });

    ensureBackfilledUser(db, "the-app-password", "teacher");

    expect(countUsers(db)).toBe(1);
    expect(authenticateByPassword(db, "the-app-password")).toBeUndefined();
    expect(authenticateByPassword(db, "already-here")?.username).toBe("existing");
  });
});
