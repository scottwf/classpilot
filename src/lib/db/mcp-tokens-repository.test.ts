// @vitest-environment node
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createClassPilotDatabase } from "./sqlite";
import { createUser } from "./users-repository";
import {
  createMcpToken,
  listMcpTokens,
  resolveMcpToken,
  revokeMcpToken,
} from "./mcp-tokens-repository";

function freshDb() {
  const path = join(mkdtempSync(join(tmpdir(), "classpilot-mcp-tokens-")), "test.sqlite");
  return createClassPilotDatabase(path);
}

describe("mcp tokens repository", () => {
  it("resolves a freshly created token back to its owner", () => {
    const db = freshDb();
    const user = createUser(db, { username: "teacher", password: "x" });

    const { token } = createMcpToken(db, user.id, "Claude Code");

    expect(token.startsWith("mcp_")).toBe(true);
    expect(resolveMcpToken(db, token)?.userId).toBe(user.id);
  });

  it("does not resolve an unknown token", () => {
    const db = freshDb();
    expect(resolveMcpToken(db, "mcp_not-a-real-token")).toBeUndefined();
  });

  it("never stores the plaintext token", () => {
    const db = freshDb();
    const user = createUser(db, { username: "teacher", password: "x" });
    const { id, token } = createMcpToken(db, user.id, "Claude Code");

    const row = db.prepare("SELECT token_hash FROM mcp_tokens WHERE id = ?").get(id) as {
      token_hash: string;
    };
    expect(row.token_hash).not.toBe(token);
    expect(row.token_hash).not.toContain(token);
  });

  it("stamps last_used_at on resolve, leaves it null until first use", () => {
    const db = freshDb();
    const user = createUser(db, { username: "teacher", password: "x" });
    const { token } = createMcpToken(db, user.id, "Claude Code");

    const before = listMcpTokens(db, user.id)[0];
    expect(before.lastUsedAt).toBeNull();

    resolveMcpToken(db, token);

    const after = listMcpTokens(db, user.id)[0];
    expect(after.lastUsedAt).not.toBeNull();
  });

  it("stops resolving a token once revoked", () => {
    const db = freshDb();
    const user = createUser(db, { username: "teacher", password: "x" });
    const { id, token } = createMcpToken(db, user.id, "Claude Code");

    expect(resolveMcpToken(db, token)?.userId).toBe(user.id);

    revokeMcpToken(db, user.id, id);

    expect(resolveMcpToken(db, token)).toBeUndefined();
  });

  it("does not let one user revoke another user's token", () => {
    const db = freshDb();
    const userA = createUser(db, { username: "teacherA", password: "x" });
    const userB = createUser(db, { username: "teacherB", password: "y" });
    const { id, token } = createMcpToken(db, userA.id, "Claude Code");

    expect(() => revokeMcpToken(db, userB.id, id)).toThrow("MCP token not found");
    // Untouched -- still resolves.
    expect(resolveMcpToken(db, token)?.userId).toBe(userA.id);
  });

  it("lists only the requesting user's tokens", () => {
    const db = freshDb();
    const userA = createUser(db, { username: "teacherA", password: "x" });
    const userB = createUser(db, { username: "teacherB", password: "y" });
    createMcpToken(db, userA.id, "A's token");
    createMcpToken(db, userB.id, "B's token");

    const tokensForA = listMcpTokens(db, userA.id);
    expect(tokensForA).toHaveLength(1);
    expect(tokensForA[0].label).toBe("A's token");
  });

  it("scopes token resolution by revocation status, not by which user asks", () => {
    // resolveMcpToken has no userId input -- it derives the user purely
    // from the token itself. This test documents that on purpose: it's
    // the auth boundary itself, called before any user identity is known.
    const db = freshDb();
    const user = createUser(db, { username: "teacher", password: "x" });
    const { token } = createMcpToken(db, user.id, "Claude Code");

    expect(resolveMcpToken(db, token)).toEqual({ userId: user.id });
  });
});
