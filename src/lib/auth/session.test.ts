import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
} from "./session";

describe("signed auth session tokens", () => {
  it("verifies a token signed with the same secret", () => {
    const token = createSessionToken({
      now: 1_800_000_000_000,
      secret: "test-secret",
    });

    expect(
      verifySessionToken({
        now: 1_800_000_001_000,
        secret: "test-secret",
        token,
      }),
    ).toBe(true);
  });

  it("rejects tampered tokens", () => {
    const token = createSessionToken({
      now: 1_800_000_000_000,
      secret: "test-secret",
    });

    expect(
      verifySessionToken({
        now: 1_800_000_001_000,
        secret: "test-secret",
        token: token.replace("auth", "fake"),
      }),
    ).toBe(false);
  });

  it("rejects expired tokens", () => {
    const token = createSessionToken({
      now: 1_800_000_000_000,
      secret: "test-secret",
      ttlMs: 1000,
    });

    expect(
      verifySessionToken({
        now: 1_800_000_002_000,
        secret: "test-secret",
        token,
      }),
    ).toBe(false);
  });
});
