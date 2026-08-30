import { randomUUID } from "node:crypto";
import { estimateCostUsd } from "@/src/lib/ai/pricing";
import type { AiUsage, AiUsagePurpose } from "@/src/lib/ai/types";
import type { ClassPilotDatabase } from "./sqlite";

export type AiUsageProvider = "hosted" | "local";

export type RecordAiUsageInput = {
  provider: AiUsageProvider;
  model: string;
  purpose: AiUsagePurpose;
  usage: AiUsage;
  /** Injectable for tests; defaults to now. */
  occurredAt?: string;
};

export type AiUsageEntry = {
  id: string;
  occurredAt: string;
  provider: AiUsageProvider;
  model: string;
  purpose: AiUsagePurpose;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Estimated USD, or null when the model isn't in the pricing table. */
  costUsd: number | null;
};

type AiUsageRow = {
  id: string;
  occurred_at: string;
  provider: string;
  model: string;
  purpose: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

/**
 * Logs one AI provider call (issue #28). Global, not per-user: AI provider
 * config lives in `app_settings`, which is global too (issue #21's explicit
 * decision), so per-user usage would report against a shared key and imply
 * an isolation that doesn't exist.
 *
 * Never throws. Usage accounting is a reporting nicety — a failed insert
 * (locked database, disk full) must not turn a lesson draft the teacher
 * actually asked for into an error. Callers await it for ordering only.
 */
export function recordAiUsage(db: ClassPilotDatabase, input: RecordAiUsageInput): void {
  try {
    db.prepare(
      `INSERT INTO ai_usage_log
         (id, occurred_at, provider, model, purpose, prompt_tokens, completion_tokens, total_tokens)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      `ai-usage-${randomUUID()}`,
      input.occurredAt ?? new Date().toISOString(),
      input.provider,
      input.model,
      input.purpose,
      input.usage.promptTokens,
      input.usage.completionTokens,
      input.usage.totalTokens,
    );
  } catch {
    // Deliberately swallowed — see the doc comment above.
  }
}

function mapRow(row: AiUsageRow): AiUsageEntry {
  const provider: AiUsageProvider = row.provider === "local" ? "local" : "hosted";

  return {
    completionTokens: row.completion_tokens,
    costUsd: estimateCostUsd({
      completionTokens: row.completion_tokens,
      model: row.model,
      promptTokens: row.prompt_tokens,
      provider,
    }),
    id: row.id,
    model: row.model,
    occurredAt: row.occurred_at,
    promptTokens: row.prompt_tokens,
    provider,
    purpose: row.purpose as AiUsagePurpose,
    totalTokens: row.total_tokens,
  };
}

/** Most recent calls first, for the "recent activity" table in Settings. */
export function listRecentAiUsage(db: ClassPilotDatabase, limit = 20): AiUsageEntry[] {
  const rows = db
    .prepare(
      `SELECT id, occurred_at, provider, model, purpose, prompt_tokens, completion_tokens, total_tokens
       FROM ai_usage_log
       ORDER BY occurred_at DESC, rowid DESC
       LIMIT ?`,
    )
    .all(limit) as AiUsageRow[];

  return rows.map(mapRow);
}

export type AiUsageTotals = {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Summed estimate over the priced calls only. */
  costUsd: number;
  /** Calls whose model isn't in the pricing table, so `costUsd` understates
   * the real figure — surfaced in the UI rather than hidden. */
  unpricedCalls: number;
};

export type AiUsageBreakdownRow = AiUsageTotals & {
  provider: AiUsageProvider;
  model: string;
};

export type AiUsageSummary = {
  last7Days: AiUsageTotals;
  last30Days: AiUsageTotals;
  allTime: AiUsageTotals;
  /** All-time totals grouped by provider + model, heaviest use first. */
  byModel: AiUsageBreakdownRow[];
  byPurpose: Array<AiUsageTotals & { purpose: AiUsagePurpose }>;
};

const emptyTotals: AiUsageTotals = {
  calls: 0,
  completionTokens: 0,
  costUsd: 0,
  promptTokens: 0,
  totalTokens: 0,
  unpricedCalls: 0,
};

function totalsFrom(entries: AiUsageEntry[]): AiUsageTotals {
  return entries.reduce<AiUsageTotals>(
    (totals, entry) => ({
      calls: totals.calls + 1,
      completionTokens: totals.completionTokens + entry.completionTokens,
      costUsd: totals.costUsd + (entry.costUsd ?? 0),
      promptTokens: totals.promptTokens + entry.promptTokens,
      totalTokens: totals.totalTokens + entry.totalTokens,
      unpricedCalls: totals.unpricedCalls + (entry.costUsd === null ? 1 : 0),
    }),
    emptyTotals,
  );
}

function groupBy<K extends string>(
  entries: AiUsageEntry[],
  key: (entry: AiUsageEntry) => K,
): Array<{ key: K; totals: AiUsageTotals }> {
  const buckets = new Map<K, AiUsageEntry[]>();

  for (const entry of entries) {
    const bucketKey = key(entry);
    const bucket = buckets.get(bucketKey);
    if (bucket) {
      bucket.push(entry);
    } else {
      buckets.set(bucketKey, [entry]);
    }
  }

  return [...buckets.entries()]
    .map(([bucketKey, bucketEntries]) => ({ key: bucketKey, totals: totalsFrom(bucketEntries) }))
    .sort((a, b) => b.totals.totalTokens - a.totals.totalTokens);
}

function daysAgo(days: number, now: Date): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** All-time totals per (provider, model) pair, heaviest token use first.
 * Grouped on a Map keyed by provider+model rather than a joined string, so
 * a model ID containing a separator character can't collide. */
function groupModelTotals(entries: AiUsageEntry[]): AiUsageBreakdownRow[] {
  const buckets = new Map<string, { provider: AiUsageProvider; model: string; entries: AiUsageEntry[] }>();

  for (const entry of entries) {
    const key = JSON.stringify([entry.provider, entry.model]);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.entries.push(entry);
    } else {
      buckets.set(key, { entries: [entry], model: entry.model, provider: entry.provider });
    }
  }

  return [...buckets.values()]
    .map((bucket) => ({ ...totalsFrom(bucket.entries), model: bucket.model, provider: bucket.provider }))
    .sort((a, b) => b.totalTokens - a.totalTokens);
}

/**
 * Rolling totals plus per-model and per-feature breakdowns for the Settings
 * usage panel. Reads the whole log and aggregates in JS rather than in SQL:
 * cost estimation is a JS-side model-name lookup (see pricing.ts), and this
 * table is one row per AI call for a single teacher — thousands of rows at
 * most, so the simplicity is worth more than the query optimization.
 *
 * `now` is injectable so the rolling windows are testable.
 */
export function getAiUsageSummary(db: ClassPilotDatabase, now = new Date()): AiUsageSummary {
  const rows = db
    .prepare(
      `SELECT id, occurred_at, provider, model, purpose, prompt_tokens, completion_tokens, total_tokens
       FROM ai_usage_log`,
    )
    .all() as AiUsageRow[];

  const entries = rows.map(mapRow);
  const since7 = daysAgo(7, now);
  const since30 = daysAgo(30, now);

  return {
    allTime: totalsFrom(entries),
    byModel: groupModelTotals(entries),
    byPurpose: groupBy(entries, (entry) => entry.purpose).map(({ key, totals }) => ({
      ...totals,
      purpose: key,
    })),
    last7Days: totalsFrom(entries.filter((entry) => entry.occurredAt >= since7)),
    last30Days: totalsFrom(entries.filter((entry) => entry.occurredAt >= since30)),
  };
}

/** Wipes the usage log. Exposed in Settings so a teacher can reset the
 * counters (e.g. at the start of a billing period) without touching the
 * database by hand. Deletes counts only — no plan or student data. */
export function clearAiUsageLog(db: ClassPilotDatabase): void {
  db.prepare("DELETE FROM ai_usage_log").run();
}
