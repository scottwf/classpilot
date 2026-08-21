// @vitest-environment node
//
// Vitest's default environment (jsdom, set globally in vitest.config.ts) is a
// browser-like sandbox that can't bundle the Node-only `node:sqlite` module
// this file (transitively) imports. Force the real Node environment here.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createClassPilotDatabase } from "./sqlite";
import { getAppSettings, updateAppSettings } from "./settings-repository";

function temporaryDatabasePath() {
  return join(mkdtempSync(join(tmpdir(), "classpilot-test-")), "test.sqlite");
}

describe("settings repository", () => {
  it("returns all-empty settings when nothing has been saved yet", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    expect(getAppSettings(db)).toEqual({
      aiApiKey: "",
      aiBaseUrl: "",
      aiModel: "",
      aiLocalBaseUrl: "",
      aiLocalModel: "",
    });
  });

  it("round-trips settings, storing the API key encrypted at rest", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    updateAppSettings(db, {
      aiApiKey: "sk-super-secret",
      aiBaseUrl: "https://openrouter.ai/api/v1",
      aiModel: "deepseek/deepseek-chat",
      aiLocalBaseUrl: "http://localhost:11434/v1",
      aiLocalModel: "llama3.1",
    });

    expect(getAppSettings(db)).toEqual({
      aiApiKey: "sk-super-secret",
      aiBaseUrl: "https://openrouter.ai/api/v1",
      aiModel: "deepseek/deepseek-chat",
      aiLocalBaseUrl: "http://localhost:11434/v1",
      aiLocalModel: "llama3.1",
    });

    const raw = db
      .prepare("SELECT ai_api_key_encrypted FROM app_settings WHERE id = ?")
      .get("current") as { ai_api_key_encrypted: string };
    expect(raw.ai_api_key_encrypted).not.toBe("sk-super-secret");
    expect(raw.ai_api_key_encrypted.startsWith("v1:")).toBe(true);
  });

  it("overwrites previous settings on a second update", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    updateAppSettings(db, {
      aiApiKey: "sk-first",
      aiBaseUrl: "",
      aiModel: "",
      aiLocalBaseUrl: "",
      aiLocalModel: "",
    });
    updateAppSettings(db, {
      aiApiKey: "",
      aiBaseUrl: "",
      aiModel: "",
      aiLocalBaseUrl: "http://localhost:11434/v1",
      aiLocalModel: "llama3.1",
    });

    expect(getAppSettings(db)).toEqual({
      aiApiKey: "",
      aiBaseUrl: "",
      aiModel: "",
      aiLocalBaseUrl: "http://localhost:11434/v1",
      aiLocalModel: "llama3.1",
    });
  });
});
