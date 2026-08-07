import { describe, expect, it } from "vitest";
import { buildDayAgenda } from "./day-agenda";
import type { EnrichedLesson } from "./lesson-queries";
import type { ClassSection, ScheduleSlot } from "./types";

// 2026-09-01 is a Tuesday -> cycle day 1; 2026-09-02 Wednesday -> cycle day 2.
const schoolYear = {
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  cycleLength: 2,
  blockedDates: [],
};

const mathClass = {
  id: "class-math",
  color: "blue",
} as ClassSection;
const scienceClass = {
  id: "class-science",
  color: "emerald",
} as ClassSection;

const scheduleSlots: ScheduleSlot[] = [
  { id: "slot-1", classId: "class-math", cycleDay: 1, startTime: "09:00", endTime: "09:50" },
  { id: "slot-2", classId: "class-science", cycleDay: 1, startTime: "08:00", endTime: "08:50" },
  { id: "slot-3", classId: "class-math", cycleDay: 2, startTime: "10:00", endTime: "10:50" },
];

describe("buildDayAgenda", () => {
  it("returns the day's scheduled classes in time order", () => {
    const agenda = buildDayAgenda(
      "2026-09-01",
      schoolYear,
      scheduleSlots,
      [mathClass, scienceClass],
      [],
    );

    expect(agenda.map((entry) => entry.classSection.id)).toEqual([
      "class-science",
      "class-math",
    ]);
    expect(agenda[0].lesson).toBeUndefined();
  });

  it("only includes slots for that date's cycle day", () => {
    const agenda = buildDayAgenda(
      "2026-09-01",
      schoolYear,
      scheduleSlots,
      [mathClass, scienceClass],
      [],
    );

    expect(agenda).toHaveLength(2);
    expect(agenda.every((entry) => entry.slot.cycleDay === 1)).toBe(true);
  });

  it("pairs a class with its lesson for that date when one exists", () => {
    const lesson = { id: "lesson-1", classId: "class-math", date: "2026-09-01" } as EnrichedLesson;

    const agenda = buildDayAgenda(
      "2026-09-01",
      schoolYear,
      scheduleSlots,
      [mathClass, scienceClass],
      [lesson],
    );

    const mathEntry = agenda.find((entry) => entry.classSection.id === "class-math");
    expect(mathEntry?.lesson).toBe(lesson);
  });

  it("returns an empty list for a date outside the school year", () => {
    const agenda = buildDayAgenda(
      "2026-12-25",
      schoolYear,
      scheduleSlots,
      [mathClass, scienceClass],
      [],
    );

    expect(agenda).toEqual([]);
  });

  it("skips a slot whose class no longer exists", () => {
    const agenda = buildDayAgenda("2026-09-01", schoolYear, scheduleSlots, [mathClass], []);

    expect(agenda.map((entry) => entry.classSection.id)).toEqual(["class-math"]);
  });
});
