import type { TranscriptionConfig } from "./types";

const defaultModel = "whisper-1";

/**
 * Resolves the local transcription service (issue #36) -- deliberately no
 * hosted fallback and no sensible default base URL, same reasoning as
 * {@link getLocalAiConfig} in src/lib/ai/config.ts: a recording contains
 * real student names/details, so this must point at LAN/Tailscale-only
 * infrastructure or not run at all. `CLASSPILOT_TRANSCRIPTION_MODEL`
 * defaults to `whisper-1` (the OpenAI Whisper API's model string) since
 * most self-hosted Whisper-compatible servers (faster-whisper, whisper.cpp
 * server mode, etc.) implement that same request shape and either honor it
 * or ignore it.
 */
export function getTranscriptionConfig(): TranscriptionConfig | null {
  const baseUrl = process.env.CLASSPILOT_TRANSCRIPTION_URL?.trim() || "";

  if (!baseUrl) {
    return null;
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    model: process.env.CLASSPILOT_TRANSCRIPTION_MODEL?.trim() || defaultModel,
  };
}

export function isTranscriptionConfigured(): boolean {
  return getTranscriptionConfig() !== null;
}
