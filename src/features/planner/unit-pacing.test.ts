import { describe, expect, it } from "vitest";
import { computeUnitEndDate, computeUnitPacing, findOverlappingUnitIds } from "./unit-pacing";

// 2026-09-01 is a Tuesday; 2026-09-01..04 are four weekday instructional
// days with no weekend or blocked date in between.
const schoolYear = {
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  cycleLength: 1,
  blockedDates: [],
};

const dailyClass = { cycleDays: [] as number[] };

function lessonStub(id: string) {
  return { id, title: id, date: "2026-09-01", sequence: 1, durationMinutes: 45, status: "planned" as const, outcomeIds: [], summary: "" };
}

describe("computeUnitPacing", () => {
  it("flags a unit as overloaded when it has more lessons than meeting days", () => {
    const unit = {
      startDate: "2026-09-01",
      endDate: "2026-09-04",
      lessons: [lessonStub("1"), lessonStub("2"), lessonStub("3"), lessonStub("4"), lessonStub("5")],
    };

    const pacing = computeUnitPacing(unit, dailyClass, schoolYear);

    expect(pacing).toEqual({
      availableMeetingDays: 4,
      isOverloaded: true,
      scheduledLessons: 5,
    });
  });

  it("does not flag a unit that fits within its meeting days", () => {
    const unit = {
      startDate: "2026-09-01",
      endDate: "2026-09-04",
      lessons: [lessonStub("1"), lessonStub("2")],
    };

    const pacing = computeUnitPacing(unit, dailyClass, schoolYear);

    expect(pacing.isOverloaded).toBe(false);
    expect(pacing.availableMeetingDays).toBe(4);
  });

  it("only counts meeting days the class actually meets on (cycle days)", () => {
    const everyOtherDayClass = { cycleDays: [1] };
    const cycleSchoolYear = { ...schoolYear, cycleLength: 2 };
    const unit = {
      startDate: "2026-09-01",
      endDate: "2026-09-04",
      lessons: [lessonStub("1"), lessonStub("2"), lessonStub("3")],
    };

    const pacing = computeUnitPacing(unit, everyOtherDayClass, cycleSchoolYear);

    // Cycle day 1 lands on 09-01 and 09-03 only.
    expect(pacing.availableMeetingDays).toBe(2);
    expect(pacing.isOverloaded).toBe(true);
  });
});

describe("findOverlappingUnitIds", () => {
  it("flags two units on the same class with overlapping date ranges", () => {
    const units = [
      { id: "a", classId: "class-1", startDate: "2026-09-01", endDate: "2026-09-10" },
      { id: "b", classId: "class-1", startDate: "2026-09-05", endDate: "2026-09-15" },
    ];

    expect(findOverlappingUnitIds(units)).toEqual(new Set(["a", "b"]));
  });

  it("does not flag units on different classes even with overlapping dates", () => {
    const units = [
      { id: "a", classId: "class-1", startDate: "2026-09-01", endDate: "2026-09-10" },
      { id: "b", classId: "class-2", startDate: "2026-09-01", endDate: "2026-09-10" },
    ];

    expect(findOverlappingUnitIds(units)).toEqual(new Set());
  });

  it("does not flag units on the same class with non-overlapping dates", () => {
    const units = [
      { id: "a", classId: "class-1", startDate: "2026-09-01", endDate: "2026-09-10" },
      { id: "b", classId: "class-1", startDate: "2026-09-20", endDate: "2026-09-25" },
    ];

    expect(findOverlappingUnitIds(units)).toEqual(new Set());
  });

  it("treats back-to-back units (end date == next start date) as overlapping by one day", () => {
    const units = [
      { id: "a", classId: "class-1", startDate: "2026-09-01", endDate: "2026-09-10" },
      { id: "b", classId: "class-1", startDate: "2026-09-10", endDate: "2026-09-20" },
    ];

    expect(findOverlappingUnitIds(units)).toEqual(new Set(["a", "b"]));
  });
});

describe("computeUnitEndDate", () => {
  it("picks the Nth meeting date on or after the start date", () => {
    const result = computeUnitEndDate(schoolYear, dailyClass, "2026-09-01", 3);

    // 09-01, 09-02, 09-03 are the class's first three meeting days.
    expect(result).toEqual({ actualLessonDays: 3, endDate: "2026-09-03" });
  });

  it("caps actualLessonDays and falls back to the last available meeting date when the school year runs out", () => {
    const shortSchoolYear = { ...schoolYear, endDate: "2026-09-04" };

    const result = computeUnitEndDate(shortSchoolYear, dailyClass, "2026-09-01", 10);

    expect(result).toEqual({ actualLessonDays: 4, endDate: "2026-09-04" });
  });

  it("only counts the class's own cycle days", () => {
    const everyOtherDayClass = { cycleDays: [1] };
    const cycleSchoolYear = { ...schoolYear, cycleLength: 2 };

    const result = computeUnitEndDate(cycleSchoolYear, everyOtherDayClass, "2026-09-01", 2);

    // Cycle day 1 lands on 09-01 and 09-03.
    expect(result).toEqual({ actualLessonDays: 2, endDate: "2026-09-03" });
  });
});
