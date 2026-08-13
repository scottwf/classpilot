// @vitest-environment node
//
// Vitest's default environment (jsdom, set globally in vitest.config.ts) is a
// browser-like sandbox that can't bundle the Node-only `node:sqlite` module
// buildContextPrompt (transitively) imports. Force the real Node environment.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createClassPilotDatabase } from "@/src/lib/db/sqlite";
import { seedPlannerData } from "@/src/lib/db/planner-repository";
import { createUser } from "@/src/lib/db/users-repository";
import { plannerData } from "@/src/features/planner/seed-data";
import { availableToolsForDriver, buildContextPrompt } from "./chat";
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
