import { describe, expect, it } from "vitest";
import { outcomeIdFor } from "@/src/lib/curriculum/sk-outcomes";
import { plannerData } from "./seed-data";
import {
  buildOutcomeCoverage,
  getLessonsForDate,
  getLessonsForWeek,
  sortLessonBank,
} from "./lesson-queries";

describe("lesson queries", () => {
  it("finds lessons for a selected day", () => {
    const lessons = getLessonsForDate(plannerData, "2026-09-11");

    expect(lessons.map((lesson) => lesson.title)).toEqual([
      "Ratio Language in Real Life",
    ]);
    expect(lessons[0]?.subject).toBe("Mathematics");
  });

  it("finds lessons for the school week containing a selected day", () => {
    const lessons = getLessonsForWeek(plannerData, "2026-09-11");

    expect(lessons.map((lesson) => lesson.title)).toEqual([
      "Reader Identity Inventory",
      "Ratio Language in Real Life",
    ]);
  });

  it("sorts the lesson bank by date, subject, unit, or outcome", () => {
    expect(sortLessonBank(plannerData, "date")[0]?.title).toBe(
      "How Scientists Classify",
    );
    expect(sortLessonBank(plannerData, "subject")[0]?.subject).toBe(
      "English Language Arts",
    );
    expect(sortLessonBank(plannerData, "unit")[0]?.unitTitle).toBe(
      "Community, Place, and Identity",
    );
    expect(sortLessonBank(plannerData, "outcome")[0]?.outcomeCodes[0]).toBe(
      "CR6.1",
    );
  });

  it("maps planned, covered, and uncovered outcomes for a subject", () => {
    const coverage = buildOutcomeCoverage(plannerData);
    const ela = coverage.find(
      (subject) => subject.subject === "English Language Arts",
    );
    const math = coverage.find((subject) => subject.subject === "Mathematics");

    expect(ela?.covered.map((outcome) => outcome.id)).toContain(
      outcomeIdFor("English Language Arts", "CR6.1"),
    );
    expect(math?.planned.map((outcome) => outcome.id)).toContain(
      outcomeIdFor("Mathematics", "N6.5"),
    );
    expect(math?.uncovered.length).toBeGreaterThan(0);
  });
});
