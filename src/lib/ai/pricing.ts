/**
 * Rough per-model pricing so the usage page can show an estimated dollar
 * cost alongside raw token counts (issue #28).
 *
 * Deliberately a small hand-maintained table, not a live price feed: there
 * is no standard endpoint for this across OpenAI-compatible providers, and
 * a stale number that's clearly labelled "estimate" is more useful to a
 * teacher deciding whether drafting is getting expensive than no number at
 * all. Unknown models return `null` — the UI shows tokens only in that
 * case, rather than inventing a price.
 *
 * Prices are USD per 1,000,000 tokens. Local models are always free (the
 * caller short-circuits on provider === "local"), but their tokens are
 * still worth counting for context-window and performance reasons.
 */

export type ModelPricing = {
  /** USD per 1M input/prompt tokens. */
  inputPerMillion: number;
  /** USD per 1M output/completion tokens. */
  outputPerMillion: number;
};

/**
 * Keys are matched case-insensitively against the start of the model ID, so
 * a dated or vendor-prefixed variant ("gpt-4o-mini-2024-07-18",
 * "openai/gpt-4o-mini" via OpenRouter) resolves to the same entry as its
 * base name. Longest matching prefix wins, so "gpt-4o-mini" doesn't get
 * swallowed by "gpt-4o".
 */
const priceTable: Record<string, ModelPricing> = {
  "claude-haiku-4-5": { inputPerMillion: 1, outputPerMillion: 5 },
  "claude-opus-4": { inputPerMillion: 15, outputPerMillion: 75 },
  "claude-sonnet-4": { inputPerMillion: 3, outputPerMillion: 15 },
  "deepseek-chat": { inputPerMillion: 0.27, outputPerMillion: 1.1 },
  "deepseek-reasoner": { inputPerMillion: 0.55, outputPerMillion: 2.19 },
  "gpt-4.1": { inputPerMillion: 2, outputPerMillion: 8 },
  "gpt-4.1-mini": { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  "gpt-4.1-nano": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10 },
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  "o4-mini": { inputPerMillion: 1.1, outputPerMillion: 4.4 },
};

/**
 * Looks up pricing for a model ID, or `null` when it isn't in the table.
 * Strips a leading `vendor/` prefix (OpenRouter-style IDs) before matching.
 */
export function findModelPricing(model: string): ModelPricing | null {
  const normalized = model.trim().toLowerCase().split("/").pop() ?? "";

  if (!normalized) {
    return null;
  }

  const match = Object.keys(priceTable)
    .filter((key) => normalized.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];

  return match ? priceTable[match] : null;
}

/**
 * Estimated USD cost of one call, or `null` when the model isn't priced.
 * Local-provider calls are free and should be passed `provider: "local"`
 * so they report 0 rather than a hosted model's price.
 */
export function estimateCostUsd(input: {
  provider: "hosted" | "local";
  model: string;
  promptTokens: number;
  completionTokens: number;
}): number | null {
  if (input.provider === "local") {
    return 0;
  }

  const pricing = findModelPricing(input.model);

  if (!pricing) {
    return null;
  }

  return (
    (input.promptTokens / 1_000_000) * pricing.inputPerMillion +
    (input.completionTokens / 1_000_000) * pricing.outputPerMillion
  );
}
