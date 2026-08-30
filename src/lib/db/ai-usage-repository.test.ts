// @vitest-environment node
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clearAiUsageLog,
  getAiUsageSummary,
  listRecentAiUsage,
  recordAiUsage,
  type RecordAiUsageInput,
} from "./ai-usage-repository";
import { createClassPilotDatabase, type ClassPilotDatabase } from "./sqlite";

function freshDb() {
  const path = join(mkdtempSync(join(tmpdir(), "classpilot-ai-usage-")), "test.sqlite");
  return createClassPilotDatabase(path);
}

function record(
  db: ClassPilotDatabase,
  overrides: Partial<RecordAiUsageInput> & { promptTokens?: number; completionTokens?: number } = {},
) {
  const promptTokens = overrides.promptTokens ?? 1_000;
  const completionTokens = overrides.completionTokens ?? 500;

  recordAiUsage(db, {
    model: overrides.model ?? "gpt-4o-mini",
    occurredAt: overrides.occurredAt,
    provider: overrides.provider ?? "hosted",
    purpose: overrides.purpose ?? "unit_outline",
    usage: {
      completionTokens,
      promptTokens,
      totalTokens: promptTokens + completionTokens,
    },
  });
}

describe("ai usage repository", () => {
  it("records a call and reads it back", () => {
    const db = freshDb();

    record(db, { completionTokens: 200, promptTokens: 800 });

    const [entry] = listRecentAiUsage(db);

    expect(entry).toMatchObject({
      completionTokens: 200,
      model: "gpt-4o-mini",
      promptTokens: 800,
      provider: "hosted",
      purpose: "unit_outline",
      totalTokens: 1_000,
    });
  });

  it("estimates cost per entry, and leaves it null for an unpriced model", () => {
    const db = freshDb();

    record(db, { completionTokens: 1_000_000, model: "gpt-4o-mini", promptTokens: 1_000_000 });
    record(db, { model: "mystery-model" });

    const entries = listRecentAiUsage(db);
    const priced = entries.find((entry) => entry.model === "gpt-4o-mini");
    const unpriced = entries.find((entry) => entry.model === "mystery-model");

    expect(priced?.costUsd).toBeCloseTo(0.75, 10);
    expect(unpriced?.costUsd).toBeNull();
  });

  it("returns the newest calls first, capped at the limit", () => {
    const db = freshDb();

    record(db, { occurredAt: "2026-08-01T09:00:00.000Z", purpose: "unit_outline" });
    record(db, { occurredAt: "2026-08-03T09:00:00.000Z", purpose: "lesson_sections" });
    record(db, { occurredAt: "2026-08-02T09:00:00.000Z", purpose: "lesson_resource" });

    expect(listRecentAiUsage(db).map((entry) => entry.purpose)).toEqual([
      "lesson_sections",
      "lesson_resource",
      "unit_outline",
    ]);
    expect(listRecentAiUsage(db, 2)).toHaveLength(2);
  });

  it("splits totals into rolling 7- and 30-day windows", () => {
    const db = freshDb();
    const now = new Date("2026-08-30T12:00:00.000Z");

    record(db, { occurredAt: "2026-08-29T12:00:00.000Z", promptTokens: 100, completionTokens: 0 });
    record(db, { occurredAt: "2026-08-20T12:00:00.000Z", promptTokens: 200, completionTokens: 0 });
    record(db, { occurredAt: "2026-06-01T12:00:00.000Z", promptTokens: 400, completionTokens: 0 });

    const summary = getAiUsageSummary(db, now);

    expect(summary.last7Days.totalTokens).toBe(100);
    expect(summary.last30Days.totalTokens).toBe(300);
    expect(summary.allTime.totalTokens).toBe(700);
    expect(summary.allTime.calls).toBe(3);
  });

  it("groups all-time totals by provider+model and by feature", () => {
    const db = freshDb();

    record(db, { completionTokens: 0, model: "gpt-4o-mini", promptTokens: 100, purpose: "unit_outline" });
    record(db, { completionTokens: 0, model: "gpt-4o-mini", promptTokens: 300, purpose: "lesson_sections" });
    record(db, {
      completionTokens: 0,
      model: "llama3.1:8b",
      promptTokens: 50,
      provider: "local",
      purpose: "assistant_chat",
    });

    const summary = getAiUsageSummary(db);

    // Heaviest token use first.
    expect(summary.byModel.map((row) => [row.provider, row.model, row.totalTokens])).toEqual([
      ["hosted", "gpt-4o-mini", 400],
      ["local", "llama3.1:8b", 50],
    ]);
    expect(summary.byPurpose.map((row) => [row.purpose, row.calls])).toEqual([
      ["lesson_sections", 1],
      ["unit_outline", 1],
      ["assistant_chat", 1],
    ]);
  });

  it("counts unpriced calls so the UI can flag the estimate as a floor", () => {
    const db = freshDb();

    record(db, { model: "gpt-4o-mini" });
    record(db, { model: "mystery-model" });

    const summary = getAiUsageSummary(db);

    expect(summary.allTime.unpricedCalls).toBe(1);
    expect(summary.allTime.costUsd).toBeGreaterThan(0);
  });

  it("counts a local call as free but still counts its tokens", () => {
    const db = freshDb();

    record(db, { completionTokens: 500, model: "llama3.1:8b", promptTokens: 9_500, provider: "local" });

    const summary = getAiUsageSummary(db);

    expect(summary.allTime.totalTokens).toBe(10_000);
    expect(summary.allTime.costUsd).toBe(0);
    expect(summary.allTime.unpricedCalls).toBe(0);
  });

  it("never throws when the insert fails -- usage accounting can't break a draft", () => {
    const db = freshDb();
    db.exec("DROP TABLE ai_usage_log");

    expect(() => record(db)).not.toThrow();
  });

  it("clears the log without touching anything else", () => {
    const db = freshDb();

    record(db);
    clearAiUsageLog(db);

    expect(listRecentAiUsage(db)).toEqual([]);
    expect(getAiUsageSummary(db).allTime.calls).toBe(0);
  });
});
