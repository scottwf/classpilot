import { describe, expect, it } from "vitest";
import { parseUsage } from "./usage";

describe("parseUsage", () => {
  it("reads the standard OpenAI usage shape", () => {
    expect(
      parseUsage({ completion_tokens: 120, prompt_tokens: 900, total_tokens: 1020 }),
    ).toEqual({
      completionTokens: 120,
      promptTokens: 900,
      totalTokens: 1020,
    });
  });

  it("derives the total when the provider omits total_tokens", () => {
    expect(parseUsage({ completion_tokens: 40, prompt_tokens: 60 })).toEqual({
      completionTokens: 40,
      promptTokens: 60,
      totalTokens: 100,
    });
  });

  it("returns zeroes rather than throwing when usage is missing or junk", () => {
    const zeroes = { completionTokens: 0, promptTokens: 0, totalTokens: 0 };

    expect(parseUsage(undefined)).toEqual(zeroes);
    expect(parseUsage(null)).toEqual(zeroes);
    expect(parseUsage("nope")).toEqual(zeroes);
    expect(parseUsage({ prompt_tokens: "many" })).toEqual(zeroes);
    expect(parseUsage({ prompt_tokens: -5 })).toEqual(zeroes);
    expect(parseUsage({ prompt_tokens: Number.NaN })).toEqual(zeroes);
  });

  it("rounds fractional counts, which some servers report", () => {
    expect(parseUsage({ completion_tokens: 1.6, prompt_tokens: 10.4 })).toEqual({
      completionTokens: 2,
      promptTokens: 10,
      totalTokens: 12,
    });
  });
});
