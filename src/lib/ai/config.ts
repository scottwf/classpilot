import type { AiConfig } from "./types";

const defaultBaseUrl = "https://api.openai.com/v1";
const defaultModel = "gpt-4o-mini";

export type AiConfigOverrides = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

/**
 * Resolves the hosted AI provider configuration (OpenAI, OpenRouter,
 * DeepSeek, ...), or `null` when it's not configured. Used for content
 * generation — unit outlines, lesson sections, lesson resources — never
 * student data. See {@link getLocalAiConfig} for the separate local-model
 * config that drives the assistant chat's tool-calling loop.
 *
 * `overrides` — typically the in-app settings from `/settings`, stored via
 * `settings-repository.ts` — win over the environment when set, so the
 * settings page can reconfigure the assistant without touching `.env` or
 * restarting the container. Fetching those overrides touches the database,
 * so it's the caller's job (not this pure function's) — pass the resolved
 * values in.
 *
 * `CLASSPILOT_AI_BASE_URL` can still point this hosted config at a local
 * model server too (the original single-provider setup, e.g. before the
 * local/hosted split existed) — that continues to work unchanged.
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

export type LocalAiConfigOverrides = {
  baseUrl?: string;
  model?: string;
};

/**
 * Resolves the local model server config (e.g. Ollama) that drives the
 * assistant chat's tool-calling loop, or `null` when unset. Unlike the
 * hosted provider, there's no sensible default base URL or model — both
 * must be explicitly configured, since "local" only means something once
 * pointed at a real server. No API key: local servers typically don't
 * require one.
 */
export function getLocalAiConfig(overrides: LocalAiConfigOverrides = {}): AiConfig | null {
  const baseUrlOverride =
    overrides.baseUrl?.trim() || process.env.CLASSPILOT_AI_LOCAL_BASE_URL?.trim() || "";
  const model = overrides.model?.trim() || process.env.CLASSPILOT_AI_LOCAL_MODEL?.trim() || "";

  if (!baseUrlOverride || !model) {
    return null;
  }

  return {
    apiKey: "",
    baseUrl: baseUrlOverride.replace(/\/+$/, ""),
    model,
  };
}

export function isLocalAiConfigured(overrides: LocalAiConfigOverrides = {}): boolean {
  return getLocalAiConfig(overrides) !== null;
}
