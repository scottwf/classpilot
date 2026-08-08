import { describe, expect, it } from "vitest";
import { availableToolsForDriver } from "./chat";
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
