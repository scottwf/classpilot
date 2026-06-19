import type { AiConfig } from "./types";

const defaultBaseUrl = "https://api.openai.com/v1";
const defaultModel = "gpt-4o-mini";

/**
 * Resolves the AI provider configuration from the environment, or `null` when
 * the assistant is not configured. The assistant is opt-in: it stays disabled
 * (and the UI shows a setup hint) until the operator sets a key or points at a
 * local, OpenAI-compatible server.
 *
 * Two enable paths support the homelab privacy goal:
 *  - `CLASSPILOT_AI_API_KEY` for a hosted provider (OpenAI, etc.).
 *  - `CLASSPILOT_AI_BASE_URL` pointing at a local model server (Ollama,
 *    LM Studio, ...), which may not require a key.
 */
export function getAiConfig(): AiConfig | null {
  const apiKey = process.env.CLASSPILOT_AI_API_KEY?.trim() ?? "";
  const baseUrlOverride = process.env.CLASSPILOT_AI_BASE_URL?.trim() ?? "";
  const model = process.env.CLASSPILOT_AI_MODEL?.trim() || defaultModel;

  if (!apiKey && !baseUrlOverride) {
    return null;
  }

  return {
    apiKey,
    baseUrl: (baseUrlOverride || defaultBaseUrl).replace(/\/+$/, ""),
    model,
  };
}

export function isAiConfigured(): boolean {
  return getAiConfig() !== null;
}
