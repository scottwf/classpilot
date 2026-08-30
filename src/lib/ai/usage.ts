import type { AiUsage } from "./types";

/** The `usage` object OpenAI-compatible providers return alongside a
 * completion. Every field is optional because not every server sends it —
 * Ollama's OpenAI-compatible endpoint does, but some local shims don't. */
export type RawUsage = {
  prompt_tokens?: unknown;
  completion_tokens?: unknown;
  total_tokens?: unknown;
};

const emptyUsage: AiUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

/**
 * Normalizes a provider's `usage` object into {@link AiUsage} (issue #28).
 * Defensive by design: a missing, malformed, or partial `usage` yields
 * zeroes rather than throwing, because usage accounting must never be able
 * to fail a lesson draft the teacher actually asked for.
 *
 * Falls back to `prompt + completion` when `total_tokens` is absent, which
 * is common on local servers.
 */
export function parseUsage(raw: unknown): AiUsage {
  if (typeof raw !== "object" || raw === null) {
    return emptyUsage;
  }

  const usage = raw as RawUsage;
  const promptTokens = toCount(usage.prompt_tokens);
  const completionTokens = toCount(usage.completion_tokens);
  const totalTokens = toCount(usage.total_tokens) || promptTokens + completionTokens;

  return { completionTokens, promptTokens, totalTokens };
}
