import { afterEach, describe, expect, it } from "vitest";
import { getAiConfig, isAiConfigured } from "./config";

afterEach(() => {
  delete process.env.CLASSPILOT_AI_API_KEY;
  delete process.env.CLASSPILOT_AI_BASE_URL;
  delete process.env.CLASSPILOT_AI_MODEL;
});

describe("getAiConfig", () => {
  it("returns null when nothing is configured", () => {
    expect(getAiConfig()).toBeNull();
    expect(isAiConfigured()).toBe(false);
  });

  it("enables via an API key with sensible defaults", () => {
    process.env.CLASSPILOT_AI_API_KEY = "sk-test";

    expect(getAiConfig()).toEqual({
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
    });
    expect(isAiConfigured()).toBe(true);
  });

  it("enables via a local base URL without a key", () => {
    process.env.CLASSPILOT_AI_BASE_URL = "http://localhost:11434/v1/";

    expect(getAiConfig()).toEqual({
      apiKey: "",
      baseUrl: "http://localhost:11434/v1",
      model: "gpt-4o-mini",
    });
  });

  it("honors a custom model", () => {
    process.env.CLASSPILOT_AI_API_KEY = "sk-test";
    process.env.CLASSPILOT_AI_MODEL = "llama3.1";

    expect(getAiConfig()?.model).toBe("llama3.1");
  });
});
