// @vitest-environment node
//
// Vitest's default environment (jsdom, set globally in vitest.config.ts) is a
// browser-like sandbox that can't bundle the Node-only `node:sqlite` module
// buildContextPrompt (transitively) imports. Force the real Node environment.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createClassPilotDatabase } from "@/src/lib/db/sqlite";
import { seedPlannerData } from "@/src/lib/db/planner-repository";
import { createUser } from "@/src/lib/db/users-repository";
import { plannerData } from "@/src/features/planner/seed-data";
import { listRecentAiUsage } from "@/src/lib/db/ai-usage-repository";
import { availableToolsForDriver, buildContextPrompt, runAssistantChat } from "./chat";
import { assistantTools } from "./tools";

describe("availableToolsForDriver", () => {
  it("gives the local driver every registered tool", () => {
    expect(availableToolsForDriver("local")).toHaveLength(assistantTools.length);
  });

  it("never gives the hosted driver a tool that touches student data", () => {
    const hostedTools = availableToolsForDriver("hosted");

    expect(hostedTools.length).toBeGreaterThan(0);
    expect(hostedTools.every((tool) => !tool.touchesStudentData)).toBe(true);
    expect(hostedTools.length).toBeLessThan(assistantTools.length);
  });

  it("hosted tools are a strict subset of every registered tool", () => {
    const hostedNames = new Set(availableToolsForDriver("hosted").map((tool) => tool.name));
    const allNames = new Set(assistantTools.map((tool) => tool.name));

    for (const name of hostedNames) {
      expect(allNames.has(name)).toBe(true);
    }
  });
});

describe("buildContextPrompt", () => {
  it("includes today's date and the active school year's range", () => {
    const path = join(mkdtempSync(join(tmpdir(), "classpilot-test-")), "test.sqlite");
    const db = createClassPilotDatabase(path);
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    const prompt = buildContextPrompt(db, userId);
    const today = new Date().toISOString().slice(0, 10);

    expect(prompt).toContain(`Today's date: ${today}`);
    expect(prompt).toContain(plannerData.schoolYear.startDate);
    expect(prompt).toContain(plannerData.schoolYear.endDate);
    expect(prompt).toContain(plannerData.schoolYear.title);
  });
});

describe("runAssistantChat usage logging", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function seededDb() {
    const path = join(mkdtempSync(join(tmpdir(), "classpilot-chat-usage-")), "test.sqlite");
    const db = createClassPilotDatabase(path);
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);
    return { db, userId };
  }

  /** Queues canned /chat/completions bodies, one per round-trip. */
  function stubProvider(bodies: unknown[]) {
    const queue = [...bodies];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(queue.shift()), { status: 200 })),
    );
  }

  it("records the token usage the provider reported", async () => {
    const { db, userId } = seededDb();
    stubProvider([
      {
        choices: [{ message: { content: "All set." } }],
        usage: { completion_tokens: 40, prompt_tokens: 960, total_tokens: 1000 },
      },
    ]);

    await runAssistantChat({
      db,
      driver: "local",
      driverConfig: { apiKey: "", baseUrl: "http://localhost:11434/v1", model: "llama3.1:8b" },
      messages: [{ content: "hi", role: "user" }],
      userId,
    });

    expect(listRecentAiUsage(db)).toMatchObject([
      {
        completionTokens: 40,
        model: "llama3.1:8b",
        promptTokens: 960,
        provider: "local",
        purpose: "assistant_chat",
        totalTokens: 1000,
      },
    ]);
  });

  it("logs one row per provider round-trip, not one per turn", async () => {
    const { db, userId } = seededDb();
    stubProvider([
      {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                { function: { arguments: "{}", name: "no_such_tool" }, id: "call-1", type: "function" },
              ],
            },
          },
        ],
        usage: { completion_tokens: 10, prompt_tokens: 90, total_tokens: 100 },
      },
      {
        choices: [{ message: { content: "Done." } }],
        usage: { completion_tokens: 5, prompt_tokens: 195, total_tokens: 200 },
      },
    ]);

    await runAssistantChat({
      db,
      driver: "local",
      driverConfig: { apiKey: "", baseUrl: "http://localhost:11434/v1", model: "llama3.1:8b" },
      messages: [{ content: "hi", role: "user" }],
      userId,
    });

    expect(listRecentAiUsage(db).map((entry) => entry.totalTokens).sort()).toEqual([100, 200]);
  });

  it("still logs a call when the provider omits usage entirely", async () => {
    const { db, userId } = seededDb();
    stubProvider([{ choices: [{ message: { content: "No usage block here." } }] }]);

    await runAssistantChat({
      db,
      driver: "hosted",
      driverConfig: { apiKey: "k", baseUrl: "https://api.example.com/v1", model: "gpt-4o-mini" },
      messages: [{ content: "hi", role: "user" }],
      userId,
    });

    expect(listRecentAiUsage(db)).toMatchObject([
      { completionTokens: 0, promptTokens: 0, purpose: "assistant_chat", totalTokens: 0 },
    ]);
  });
});
