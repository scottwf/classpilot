// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getBuildInfo } from "./build-info";

describe("getBuildInfo", () => {
  it("falls back to a dev build when public/build-info.json doesn't exist", () => {
    // public/build-info.json is only ever written by the Dockerfile's
    // builder stage (see Dockerfile) -- it never exists in this test run.
    expect(getBuildInfo()).toEqual({
      branch: "local",
      builtAt: null,
      commitShort: "dev",
    });
  });
});
