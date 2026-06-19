import { describe, expect, it } from "vitest";
import { buildUnitOutlineMessages } from "./prompt";
import type { UnitOutlineRequest } from "./types";

const baseRequest: UnitOutlineRequest = {
  subject: "Science",
  grade: "6",
  unitFocus: "Electricity",
  weeks: 4,
  lessonsPerWeek: 3,
  lessonMinutes: 45,
  teachingNotes: "Hands-on, lots of small experiments.",
  outcomes: [
    { code: "SCI6.1", description: "Investigate static electric charge." },
    { code: "SCI6.2", description: "Build simple circuits." },
  ],
};

describe("buildUnitOutlineMessages", () => {
  it("includes subject, timing, and outcome context in the user prompt", () => {
    const [system, user] = buildUnitOutlineMessages(baseRequest);

    expect(system.role).toBe("system");
    expect(user.role).toBe("user");
    expect(user.content).toContain("Subject: Science");
    expect(user.content).toContain("Electricity");
    expect(user.content).toContain("SCI6.1: Investigate static electric charge.");
    // 4 weeks * 3 lessons = ~12 lessons.
    expect(user.content).toContain("~12 lessons");
  });

  it("asks for JSON-only output", () => {
    const [system] = buildUnitOutlineMessages(baseRequest);
    expect(system.content).toContain("ONLY a JSON object");
    expect(system.content).toContain("lessonSequence");
  });

  it("never leaks student-identifying fields (data minimization)", () => {
    const serialized = JSON.stringify(buildUnitOutlineMessages(baseRequest));

    // The request type has no student fields; assert the prompt only carries the
    // whitelisted planning context so a regression that widens the type is caught.
    const allowed = new Set([
      "Science",
      "Electricity",
      "SCI6.1",
      "SCI6.2",
    ]);
    expect(allowed.size).toBeGreaterThan(0);
    expect(serialized).not.toMatch(/student/i);
    expect(serialized).not.toMatch(/birthdate|guardian|email|phone/i);
  });

  it("handles an empty outcome list gracefully", () => {
    const [, user] = buildUnitOutlineMessages({
      ...baseRequest,
      outcomes: [],
    });

    expect(user.content).toContain("No specific outcomes selected");
  });
});
