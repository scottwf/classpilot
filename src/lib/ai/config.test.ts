import { afterEach, describe, expect, it } from "vitest";
import { getAiConfig, getLocalAiConfig, isAiConfigured, isLocalAiConfigured } from "./config";

afterEach(() => {
  delete process.env.CLASSPILOT_AI_API_KEY;
  delete process.env.CLASSPILOT_AI_BASE_URL;
  delete process.env.CLASSPILOT_AI_MODEL;
  delete process.env.CLASSPILOT_AI_LOCAL_BASE_URL;
  delete process.env.CLASSPILOT_AI_LOCAL_MODEL;
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

  it("enables via overrides alone, with no environment configured", () => {
    expect(getAiConfig({ apiKey: "sk-from-settings" })).toEqual({
      apiKey: "sk-from-settings",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
    });
  });

  it("prefers overrides over the environment when both are set", () => {
    process.env.CLASSPILOT_AI_API_KEY = "sk-env";
    process.env.CLASSPILOT_AI_BASE_URL = "http://env-host:11434/v1";
    process.env.CLASSPILOT_AI_MODEL = "env-model";

    expect(
      getAiConfig({
        apiKey: "sk-settings",
        baseUrl: "http://settings-host:11434/v1",
        model: "settings-model",
      }),
    ).toEqual({
      apiKey: "sk-settings",
      baseUrl: "http://settings-host:11434/v1",
      model: "settings-model",
    });
  });

  it("falls back to the environment for fields left unset in overrides", () => {
    process.env.CLASSPILOT_AI_API_KEY = "sk-env";
    process.env.CLASSPILOT_AI_MODEL = "env-model";

    expect(getAiConfig({ baseUrl: "http://settings-host:11434/v1" })).toEqual({
      apiKey: "sk-env",
      baseUrl: "http://settings-host:11434/v1",
      model: "env-model",
    });
  });
});

describe("getLocalAiConfig", () => {
  it("returns null when nothing is configured", () => {
    expect(getLocalAiConfig()).toBeNull();
    expect(isLocalAiConfigured()).toBe(false);
  });

  it("returns null when only a base URL is set (no default model)", () => {
    expect(getLocalAiConfig({ baseUrl: "http://localhost:11434/v1" })).toBeNull();
  });

  it("returns null when only a model is set (no default base URL)", () => {
    expect(getLocalAiConfig({ model: "llama3.1" })).toBeNull();
  });

  it("enables once both base URL and model are set, with no API key", () => {
    expect(
      getLocalAiConfig({ baseUrl: "http://localhost:11434/v1/", model: "llama3.1" }),
    ).toEqual({
      apiKey: "",
      baseUrl: "http://localhost:11434/v1",
      model: "llama3.1",
    });
    expect(
      isLocalAiConfigured({ baseUrl: "http://localhost:11434/v1", model: "llama3.1" }),
    ).toBe(true);
  });

  it("falls back to the environment when overrides are unset", () => {
    process.env.CLASSPILOT_AI_LOCAL_BASE_URL = "http://xbox:11434/v1";
    process.env.CLASSPILOT_AI_LOCAL_MODEL = "qwen2.5";

    expect(getLocalAiConfig()).toEqual({
      apiKey: "",
      baseUrl: "http://xbox:11434/v1",
      model: "qwen2.5",
    });
  });

  it("prefers overrides over the environment when both are set", () => {
    process.env.CLASSPILOT_AI_LOCAL_BASE_URL = "http://env-host:11434/v1";
    process.env.CLASSPILOT_AI_LOCAL_MODEL = "env-model";

    expect(
      getLocalAiConfig({ baseUrl: "http://settings-host:11434/v1", model: "settings-model" }),
    ).toEqual({
      apiKey: "",
      baseUrl: "http://settings-host:11434/v1",
      model: "settings-model",
    });
  });
});
