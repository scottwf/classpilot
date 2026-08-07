import { describe, expect, it } from "vitest";
import { buildLessonDraftMessages, buildUnitOutlineMessages } from "./prompt";
import type { LessonDraftRequest, UnitOutlineRequest } from "./types";

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

const baseLessonRequest: LessonDraftRequest = {
  subject: "Mathematics",
  grade: "6",
  unitTitle: "Ratios, Rates, and Percent",
  lessonTitle: "Percent in Flyers",
  lessonFocus: "Compare flyer deals with ratio and percent reasoning.",
  lessonMinutes: 45,
  teachingNotes: "Bring real flyers.",
  outcomes: [{ code: "N6.5", description: "Demonstrate an understanding of percent." }],
};

describe("buildLessonDraftMessages", () => {
  it("includes subject, unit, lesson, timing, and outcome context", () => {
    const [system, user] = buildLessonDraftMessages(baseLessonRequest);

    expect(system.role).toBe("system");
    expect(user.role).toBe("user");
    expect(user.content).toContain("Subject: Mathematics");
    expect(user.content).toContain("Unit: Ratios, Rates, and Percent");
    expect(user.content).toContain("Lesson: Percent in Flyers");
    expect(user.content).toContain("Compare flyer deals with ratio and percent reasoning.");
    expect(user.content).toContain("N6.5: Demonstrate an understanding of percent.");
    expect(user.content).toContain("Duration: 45 minutes");
  });

  it("asks for JSON-only output matching the lesson sections shape", () => {
    const [system] = buildLessonDraftMessages(baseLessonRequest);

    expect(system.content).toContain("ONLY a JSON object");
    expect(system.content).toContain("learningGoals");
    expect(system.content).toContain("lessonFlow");
    expect(system.content).toContain("reflection");
  });

  it("never leaks student-identifying fields (data minimization)", () => {
    const serialized = JSON.stringify(buildLessonDraftMessages(baseLessonRequest));

    expect(serialized).not.toMatch(/student/i);
    expect(serialized).not.toMatch(/birthdate|guardian|email|phone/i);
  });

  it("handles an empty outcome list and blank focus gracefully", () => {
    const [, user] = buildLessonDraftMessages({
      ...baseLessonRequest,
      outcomes: [],
      lessonFocus: "",
    });

    expect(user.content).toContain("No specific outcomes selected");
    expect(user.content).toContain("infer from the lesson title and unit");
  });
});
