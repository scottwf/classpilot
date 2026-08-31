import { describe, expect, it } from "vitest";
import { outcomeIdFor } from "@/src/lib/curriculum/sk-outcomes";
import { plannerData } from "./seed-data";
import type { LessonPlan, UnitPlan } from "./types";
import {
  buildCourseOutline,
  buildLessonBankFilterOptions,
  buildOutcomeCoverage,
  filterLessonBank,
  getAllLessons,
  getLessonsForDate,
  getLessonsForWeek,
  resolvePlanBookDefaultDate,
  shiftDateKey,
  shiftToWeekday,
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

  it("tags every lesson with its unit's shade tier within the parent class", () => {
    const lessons = getAllLessons(plannerData);
    const byUnit = new Map(lessons.map((lesson) => [lesson.unitId, lesson]));

    // Every lesson of a unit reports the same shade, and units of the same
    // class get different shades -- that's what makes a lesson row look
    // like the unit it belongs to (issue #27).
    for (const lesson of lessons) {
      expect(lesson.unitShadeIndex).toBe(byUnit.get(lesson.unitId)?.unitShadeIndex);
      expect(lesson.unitShadeIndex).toBeGreaterThanOrEqual(0);
    }

    const mathUnits = lessons.filter((lesson) => lesson.subject === "Mathematics");
    const distinctUnits = new Set(mathUnits.map((lesson) => lesson.unitId));

    if (distinctUnits.size > 1) {
      expect(new Set(mathUnits.map((lesson) => lesson.unitShadeIndex)).size).toBeGreaterThan(1);
    }
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

  it("filters the lesson bank by subject, unit, grade, and outcome", () => {
    const lessons = getAllLessons(plannerData);
    const mathLessons = filterLessonBank(lessons, { subject: "Mathematics" });

    expect(mathLessons.length).toBeGreaterThan(0);
    expect(mathLessons.every((lesson) => lesson.subject === "Mathematics")).toBe(true);

    const oneUnit = mathLessons[0]!.unitId;
    expect(
      filterLessonBank(lessons, { unitId: oneUnit }).every((lesson) => lesson.unitId === oneUnit),
    ).toBe(true);

    const oneOutcome = mathLessons.flatMap((lesson) => lesson.outcomeCodes)[0]!;
    expect(
      filterLessonBank(lessons, { outcomeCode: oneOutcome }).every((lesson) =>
        lesson.outcomeCodes.includes(oneOutcome),
      ),
    ).toBe(true);

    expect(filterLessonBank(lessons, { subject: "Nonexistent Subject" })).toHaveLength(0);
    expect(filterLessonBank(lessons, {})).toHaveLength(lessons.length);
  });

  it("builds distinct, sorted filter options from the lesson bank", () => {
    const options = buildLessonBankFilterOptions(getAllLessons(plannerData));

    expect(options.subjects).toEqual([...options.subjects].sort());
    expect(new Set(options.subjects).size).toBe(options.subjects.length);
    expect(options.units.length).toBeGreaterThan(0);
    expect(new Set(options.units.map((unit) => unit.id)).size).toBe(options.units.length);
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

describe("shiftDateKey", () => {
  it("shifts a date forward and backward by whole calendar days", () => {
    expect(shiftDateKey("2026-09-11", 1)).toBe("2026-09-12");
    expect(shiftDateKey("2026-09-11", -1)).toBe("2026-09-10");
    expect(shiftDateKey("2026-09-11", 7)).toBe("2026-09-18");
  });

  it("rolls over month and year boundaries", () => {
    expect(shiftDateKey("2026-09-30", 1)).toBe("2026-10-01");
    expect(shiftDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("shiftToWeekday", () => {
  it("skips the weekend when stepping forward from a Friday", () => {
    // 2026-09-11 is a Friday.
    expect(shiftToWeekday("2026-09-11", 1)).toBe("2026-09-14");
  });

  it("skips the weekend when stepping backward from a Monday", () => {
    // 2026-09-14 is a Monday.
    expect(shiftToWeekday("2026-09-14", -1)).toBe("2026-09-11");
  });

  it("lands on a real weekday even when starting from a weekend itself", () => {
    // 2026-09-12 is a Saturday.
    expect(shiftToWeekday("2026-09-12", 1)).toBe("2026-09-14");
    expect(shiftToWeekday("2026-09-12", -1)).toBe("2026-09-11");
  });

  it("steps by more than one weekday, still skipping weekends", () => {
    // Friday + 2 weekdays -> skip the weekend, then Mon, Tue.
    expect(shiftToWeekday("2026-09-11", 2)).toBe("2026-09-15");
  });
});

describe("resolvePlanBookDefaultDate", () => {
  const schoolYear = { startDate: "2026-09-02", endDate: "2026-12-18" };

  it("defaults to today when today falls within the school year", () => {
    expect(resolvePlanBookDefaultDate(schoolYear, [], "2026-10-15")).toBe("2026-10-15");
  });

  it("defaults to the first day with a lesson when today is before the school year starts", () => {
    const lessonDates = ["2026-09-05", "2026-09-08", "2026-09-03"];

    expect(resolvePlanBookDefaultDate(schoolYear, lessonDates, "2026-08-09")).toBe("2026-09-03");
  });

  it("falls back to the school year's start date when today is before the year and there are no lessons yet", () => {
    expect(resolvePlanBookDefaultDate(schoolYear, [], "2026-08-09")).toBe("2026-09-02");
  });

  it("ignores lessons dated before the school year starts", () => {
    const lessonDates = ["2026-06-01", "2026-09-10"];

    expect(resolvePlanBookDefaultDate(schoolYear, lessonDates, "2026-08-09")).toBe("2026-09-10");
  });

  it("defaults to the school year's end date when today is after the school year ends", () => {
    expect(resolvePlanBookDefaultDate(schoolYear, [], "2027-01-15")).toBe("2026-12-18");
  });

  it("jumps to the next Monday when today is a Saturday within the school year (#46)", () => {
    // 2026-09-05 is a Saturday.
    expect(resolvePlanBookDefaultDate(schoolYear, [], "2026-09-05")).toBe("2026-09-07");
  });

  it("jumps to the next Monday when today is a Sunday within the school year (#46)", () => {
    // 2026-09-06 is a Sunday.
    expect(resolvePlanBookDefaultDate(schoolYear, [], "2026-09-06")).toBe("2026-09-07");
  });
});

describe("buildCourseOutline", () => {
  const lesson = (id: string): LessonPlan => ({
    id,
    title: id,
    date: null,
    sequence: 1,
    durationMinutes: 45,
    status: "planned",
    outcomeIds: [],
    summary: "",
  });

  it("scopes to the given class and sorts units chronologically by start date", () => {
    const units: UnitPlan[] = [
      {
        id: "unit-b",
        classId: "class-math",
        title: "Unit B",
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        outcomeIds: [],
        lessons: [lesson("lesson-b1")],
        notes: "",
      },
      {
        id: "unit-a",
        classId: "class-math",
        title: "Unit A",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        outcomeIds: [],
        lessons: [lesson("lesson-a1")],
        notes: "",
      },
      {
        id: "unit-other-class",
        classId: "class-science",
        title: "Other class's unit",
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        outcomeIds: [],
        lessons: [],
        notes: "",
      },
    ];

    const outline = buildCourseOutline(units, "class-math");

    expect(outline.map((entry) => entry.unit.id)).toEqual(["unit-a", "unit-b"]);
    expect(outline[0].lessons.map((l) => l.id)).toEqual(["lesson-a1"]);
  });

  it("preserves each unit's existing lesson order rather than re-sorting", () => {
    const units: UnitPlan[] = [
      {
        id: "unit-a",
        classId: "class-math",
        title: "Unit A",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        outcomeIds: [],
        lessons: [lesson("lesson-2"), lesson("lesson-1")],
        notes: "",
      },
    ];

    expect(buildCourseOutline(units, "class-math")[0].lessons.map((l) => l.id)).toEqual([
      "lesson-2",
      "lesson-1",
    ]);
  });

  it("returns an empty outline for a class with no units", () => {
    expect(buildCourseOutline([], "class-math")).toEqual([]);
  });
});
