import { describe, expect, it } from "vitest";
import { generateStoredDictationName, isAllowedDictationFile } from "./dictation-storage";

describe("dictation storage", () => {
  it("allows common voice-memo export extensions", () => {
    expect(isAllowedDictationFile("Voice Memo 4.m4a")).toBe(true);
    expect(isAllowedDictationFile("recording.MP3")).toBe(true);
    expect(isAllowedDictationFile("clip.wav")).toBe(true);
    expect(isAllowedDictationFile("clip.webm")).toBe(true);
  });

  it("rejects extensions outside the allow-list", () => {
    expect(isAllowedDictationFile("script.exe")).toBe(false);
    expect(isAllowedDictationFile("document.pdf")).toBe(false);
    expect(isAllowedDictationFile("noextension")).toBe(false);
  });

  it("generates a stored filename that preserves the extension but not the original name", () => {
    const storedName = generateStoredDictationName("Drive Home Sept 8.m4a");

    expect(storedName).not.toContain("Drive Home Sept 8");
    expect(storedName.toLowerCase().endsWith(".m4a")).toBe(true);
    expect(generateStoredDictationName("a.m4a")).not.toBe(generateStoredDictationName("a.m4a"));
  });
});
