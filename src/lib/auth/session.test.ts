import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
} from "./session";

describe("signed auth session tokens", () => {
  it("verifies a token signed with the same secret and returns the embedded userId", () => {
    const token = createSessionToken({
      now: 1_800_000_000_000,
      secret: "test-secret",
      userId: "user-abc123",
    });

    expect(
      verifySessionToken({
        now: 1_800_000_001_000,
        secret: "test-secret",
        token,
      }),
    ).toEqual({ userId: "user-abc123", expiresAt: 1_800_000_000_000 + 1000 * 60 * 60 * 24 * 14 });
  });

  it("rejects tampered tokens", () => {
    const token = createSessionToken({
      now: 1_800_000_000_000,
      secret: "test-secret",
      userId: "user-abc123",
    });

    expect(
      verifySessionToken({
        now: 1_800_000_001_000,
        secret: "test-secret",
        token: token.replace("auth", "fake"),
      }),
    ).toBeNull();
  });

  it("rejects a token whose userId segment was swapped for a different user, even if otherwise well-formed", () => {
    const token = createSessionToken({
      now: 1_800_000_000_000,
      secret: "test-secret",
      userId: "user-abc123",
    });

    expect(
      verifySessionToken({
        now: 1_800_000_001_000,
        secret: "test-secret",
        token: token.replace("user-abc123", "user-xyz789"),
      }),
    ).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = createSessionToken({
      now: 1_800_000_000_000,
      secret: "test-secret",
      ttlMs: 1000,
      userId: "user-abc123",
    });

    expect(
      verifySessionToken({
        now: 1_800_000_002_000,
        secret: "test-secret",
        token,
      }),
    ).toBeNull();
  });

  it("rejects a missing token", () => {
    expect(verifySessionToken({ secret: "test-secret" })).toBeNull();
  });
});
