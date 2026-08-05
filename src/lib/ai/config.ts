import type { AiConfig } from "./types";

const defaultBaseUrl = "https://api.openai.com/v1";
const defaultModel = "gpt-4o-mini";

export type AiConfigOverrides = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

/**
 * Resolves the AI provider configuration, or `null` when the assistant is not
 * configured. The assistant is opt-in: it stays disabled (and the UI shows a
 * setup hint) until it's configured via one of these paths.
 *
 * `overrides` — typically the in-app settings from `/settings`, stored via
 * `settings-repository.ts` — win over the environment when set, so the
 * settings page can reconfigure the assistant without touching `.env` or
 * restarting the container. Fetching those overrides touches the database,
 * so it's the caller's job (not this pure function's) — pass the resolved
 * values in.
 *
 * Two environment enable paths support the homelab privacy goal:
 *  - `CLASSPILOT_AI_API_KEY` for a hosted provider (OpenAI, etc.).
 *  - `CLASSPILOT_AI_BASE_URL` pointing at a local model server (Ollama,
 *    LM Studio, ...), which may not require a key.
 */
export function getAiConfig(overrides: AiConfigOverrides = {}): AiConfig | null {
  const apiKey = overrides.apiKey?.trim() || process.env.CLASSPILOT_AI_API_KEY?.trim() || "";
  const baseUrlOverride =
    overrides.baseUrl?.trim() || process.env.CLASSPILOT_AI_BASE_URL?.trim() || "";
  const model = overrides.model?.trim() || process.env.CLASSPILOT_AI_MODEL?.trim() || defaultModel;

  if (!apiKey && !baseUrlOverride) {
    return null;
  }

  return {
    apiKey,
    baseUrl: (baseUrlOverride || defaultBaseUrl).replace(/\/+$/, ""),
    model,
  };
}

export function isAiConfigured(overrides: AiConfigOverrides = {}): boolean {
  return getAiConfig(overrides) !== null;
}
