import { afterEach, describe, expect, it } from "vitest";
import { getTranscriptionConfig, isTranscriptionConfigured } from "./config";

afterEach(() => {
  delete process.env.CLASSPILOT_TRANSCRIPTION_URL;
});

describe("getTranscriptionConfig", () => {
  it("returns null when unset -- no hosted fallback, ever", () => {
    expect(getTranscriptionConfig()).toBeNull();
    expect(isTranscriptionConfigured()).toBe(false);
  });

  it("resolves once a URL is set", () => {
    process.env.CLASSPILOT_TRANSCRIPTION_URL = "http://172.16.1.223:9000";

    expect(getTranscriptionConfig()).toEqual({
      baseUrl: "http://172.16.1.223:9000",
    });
    expect(isTranscriptionConfigured()).toBe(true);
  });

  it("strips a trailing slash from the base URL", () => {
    process.env.CLASSPILOT_TRANSCRIPTION_URL = "http://172.16.1.223:9000/";

    expect(getTranscriptionConfig()?.baseUrl).toBe("http://172.16.1.223:9000");
  });
});
