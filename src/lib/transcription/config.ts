import type { TranscriptionConfig } from "./types";

/**
 * Resolves the local transcription service (issue #36) -- deliberately no
 * hosted fallback and no sensible default base URL, same reasoning as
 * {@link getLocalAiConfig} in src/lib/ai/config.ts: a recording contains
 * real student names/details, so this must point at LAN/Tailscale-only
 * infrastructure or not run at all.
 *
 * Confirmed 2026-08-23 against the real deployed service: `ahmetoner/
 * whisper-asr-webservice` (faster-whisper engine, GPU-accelerated) on
 * xbox. No model/API-key parameter -- the model is baked into that
 * container's own config, not selectable per-request.
 */
export function getTranscriptionConfig(): TranscriptionConfig | null {
  const baseUrl = process.env.CLASSPILOT_TRANSCRIPTION_URL?.trim() || "";

  if (!baseUrl) {
    return null;
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
  };
}

export function isTranscriptionConfigured(): boolean {
  return getTranscriptionConfig() !== null;
}
