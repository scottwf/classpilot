import { afterEach, describe, expect, it } from "vitest";
import { getTranscriptionConfig, isTranscriptionConfigured } from "./config";

afterEach(() => {
  delete process.env.CLASSPILOT_TRANSCRIPTION_URL;
  delete process.env.CLASSPILOT_TRANSCRIPTION_MODEL;
});

describe("getTranscriptionConfig", () => {
  it("returns null when unset -- no hosted fallback, ever", () => {
    expect(getTranscriptionConfig()).toBeNull();
    expect(isTranscriptionConfigured()).toBe(false);
  });

  it("resolves with the default model once a URL is set", () => {
    process.env.CLASSPILOT_TRANSCRIPTION_URL = "http://172.16.1.223:9000";

    expect(getTranscriptionConfig()).toEqual({
      baseUrl: "http://172.16.1.223:9000",
      model: "whisper-1",
    });
    expect(isTranscriptionConfigured()).toBe(true);
  });

  it("strips a trailing slash from the base URL", () => {
    process.env.CLASSPILOT_TRANSCRIPTION_URL = "http://172.16.1.223:9000/";

    expect(getTranscriptionConfig()?.baseUrl).toBe("http://172.16.1.223:9000");
  });

  it("honors a custom model", () => {
    process.env.CLASSPILOT_TRANSCRIPTION_URL = "http://172.16.1.223:9000";
    process.env.CLASSPILOT_TRANSCRIPTION_MODEL = "large-v3";

    expect(getTranscriptionConfig()?.model).toBe("large-v3");
  });
});
