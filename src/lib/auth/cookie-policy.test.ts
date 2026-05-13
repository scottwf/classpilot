import { describe, expect, it } from "vitest";
import { shouldUseSecureCookies } from "./cookie-policy";

describe("auth cookie policy", () => {
  it("does not require secure cookies for local http testing in production mode", () => {
    expect(
      shouldUseSecureCookies({
        appUrl: "http://127.0.0.1:3027",
        cookieSecure: undefined,
        nodeEnv: "production",
      }),
    ).toBe(false);
  });

  it("uses secure cookies for https app urls", () => {
    expect(
      shouldUseSecureCookies({
        appUrl: "https://classpilot.chitekmedia.club",
        cookieSecure: undefined,
        nodeEnv: "production",
      }),
    ).toBe(true);
  });

  it("allows an explicit secure-cookie override", () => {
    expect(
      shouldUseSecureCookies({
        appUrl: "http://127.0.0.1:3027",
        cookieSecure: "true",
        nodeEnv: "production",
      }),
    ).toBe(true);
  });
});
