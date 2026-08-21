// @vitest-environment node
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createClassPilotDatabase } from "@/src/lib/db/sqlite";
import {
  clearLoginAttempts,
  isLoginLocked,
  recordFailedLogin,
} from "./login-rate-limit";

function freshDb() {
  const path = join(mkdtempSync(join(tmpdir(), "classpilot-login-rate-limit-")), "test.sqlite");
  return createClassPilotDatabase(path);
}

describe("login rate limiting", () => {
  it("is not locked before any failed attempts", () => {
    const db = freshDb();
    expect(isLoginLocked(db, "teacher")).toBe(false);
  });

  it("locks a username out after 5 failed attempts", () => {
    const db = freshDb();

    for (let i = 0; i < 4; i += 1) {
      recordFailedLogin(db, "teacher");
    }
    expect(isLoginLocked(db, "teacher")).toBe(false);

    recordFailedLogin(db, "teacher");
    expect(isLoginLocked(db, "teacher")).toBe(true);
  });

  it("does not lock out a different username", () => {
    const db = freshDb();

    for (let i = 0; i < 5; i += 1) {
      recordFailedLogin(db, "teacher");
    }

    expect(isLoginLocked(db, "teacher")).toBe(true);
    expect(isLoginLocked(db, "other-teacher")).toBe(false);
  });

  it("clears a locked-out username's attempts", () => {
    const db = freshDb();

    for (let i = 0; i < 5; i += 1) {
      recordFailedLogin(db, "teacher");
    }
    expect(isLoginLocked(db, "teacher")).toBe(true);

    clearLoginAttempts(db, "teacher");
    expect(isLoginLocked(db, "teacher")).toBe(false);
  });
});
