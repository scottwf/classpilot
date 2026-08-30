import { describe, expect, it } from "vitest";
import { estimateCostUsd, findModelPricing } from "./pricing";

describe("findModelPricing", () => {
  it("matches an exact model ID", () => {
    expect(findModelPricing("gpt-4o-mini")).toEqual({
      inputPerMillion: 0.15,
      outputPerMillion: 0.6,
    });
  });

  it("matches a dated variant by prefix", () => {
    expect(findModelPricing("gpt-4o-mini-2024-07-18")).toEqual(findModelPricing("gpt-4o-mini"));
  });

  it("strips an OpenRouter-style vendor prefix", () => {
    expect(findModelPricing("openai/gpt-4o-mini")).toEqual(findModelPricing("gpt-4o-mini"));
  });

  it("prefers the longest matching prefix, so gpt-4o doesn't swallow gpt-4o-mini", () => {
    expect(findModelPricing("gpt-4o-mini")).not.toEqual(findModelPricing("gpt-4o"));
  });

  it("returns null for an unknown model rather than guessing", () => {
    expect(findModelPricing("llama3.1:8b")).toBeNull();
    expect(findModelPricing("")).toBeNull();
  });
});

describe("estimateCostUsd", () => {
  it("prices prompt and completion tokens separately", () => {
    // 1M prompt @ $0.15 + 1M completion @ $0.60
    expect(
      estimateCostUsd({
        completionTokens: 1_000_000,
        model: "gpt-4o-mini",
        promptTokens: 1_000_000,
        provider: "hosted",
      }),
    ).toBeCloseTo(0.75, 10);
  });

  it("treats local model calls as free, whatever the model is named", () => {
    expect(
      estimateCostUsd({
        completionTokens: 5_000,
        model: "gpt-4o",
        promptTokens: 90_000,
        provider: "local",
      }),
    ).toBe(0);
  });

  it("returns null for an unpriced hosted model, so the UI can say so", () => {
    expect(
      estimateCostUsd({
        completionTokens: 10,
        model: "some-new-model",
        promptTokens: 10,
        provider: "hosted",
      }),
    ).toBeNull();
  });
});
