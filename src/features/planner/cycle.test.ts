import { describe, expect, it } from "vitest";
import {
  buildCycleDayMap,
  getClassMeetingDates,
  getCycleDayForDate,
  getDayInfo,
  getDayLabel,
  getNextClassMeetingDate,
} from "./cycle";

// 2026-09: 1 Tue, 2 Wed, 3 Thu, 4 Fri, 5-6 weekend, 7 Mon, 8 Tue, 9 Wed,
// 10 Thu, 11 Fri, 12-13 weekend, 14 Mon.
const schoolYear = {
  startDate: "2026-09-01",
  endDate: "2026-09-14",
  cycleLength: 2,
  blockedDates: [
    // Planned closure: consumes a cycle number (skips it).
    { date: "2026-09-04", label: "PD Day", advancesCycle: true },
    // Snow day: pauses the cycle instead of consuming a number.
    { date: "2026-09-08", label: "Snow Day", advancesCycle: false },
  ],
};

describe("buildCycleDayMap", () => {
  it("assigns cycle days 1..N in order across instructional days", () => {
    const map = buildCycleDayMap(schoolYear);

    expect(map.get("2026-09-01")).toBe(1);
    expect(map.get("2026-09-02")).toBe(2);
    expect(map.get("2026-09-03")).toBe(1);
  });

  it("skips a cycle number for a non-instructional day that advances the cycle", () => {
    const map = buildCycleDayMap(schoolYear);

    // 09-03 was Day 1; 09-04 (blocked, advances) consumes Day 2; the next
    // instructional day (09-07) should be Day 1, not Day 2.
    expect(map.get("2026-09-04")).toBeUndefined();
    expect(map.get("2026-09-07")).toBe(1);
  });

  it("does not skip a cycle number for a non-instructional day that pauses the cycle", () => {
    const map = buildCycleDayMap(schoolYear);

    // 09-07 was Day 1; 09-08 (blocked, does not advance) should NOT consume
    // Day 2 — the next instructional day (09-09) picks up Day 2 instead.
    expect(map.get("2026-09-08")).toBeUndefined();
    expect(map.get("2026-09-09")).toBe(2);
  });

  it("never assigns a cycle day to a weekend", () => {
    const map = buildCycleDayMap(schoolYear);

    expect(map.has("2026-09-05")).toBe(false);
    expect(map.has("2026-09-06")).toBe(false);
  });
});

describe("getCycleDayForDate", () => {
  it("returns the cycle day for an instructional date", () => {
    expect(getCycleDayForDate(schoolYear, "2026-09-10")).toBe(1);
  });

  it("returns undefined for a non-instructional date", () => {
    expect(getCycleDayForDate(schoolYear, "2026-09-08")).toBeUndefined();
  });
});

describe("getClassMeetingDates", () => {
  it("returns only the dates matching the class's cycle days", () => {
    const dates = getClassMeetingDates(schoolYear, { cycleDays: [1] });
    expect(dates).toEqual(["2026-09-01", "2026-09-03", "2026-09-07", "2026-09-10", "2026-09-14"]);
  });

  it("returns every instructional day when cycleDays is empty", () => {
    const dates = getClassMeetingDates(schoolYear, { cycleDays: [] });
    expect(dates).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-07",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-14",
    ]);
  });
});

describe("getClassMeetingDates with scheduleSlots", () => {
  it("derives meeting dates from a date-windowed slot instead of cycleDays, honoring the window", () => {
    // A class scheduled only via a temporary/burst slot (cycleDays stays
    // [] until addTemporaryScheduleSlot unions it in) -- once a slot is
    // passed, dates come from the slot's own start/end window, not "every
    // instructional day" fallback behavior.
    const dates = getClassMeetingDates(schoolYear, { cycleDays: [1] }, [
      { cycleDay: 1, startDate: "2026-09-07", endDate: "2026-09-14" },
    ]);
    expect(dates).toEqual(["2026-09-07", "2026-09-10", "2026-09-14"]);
  });

  it("excludes dates outside the slot's window even if the cycle day matches", () => {
    const dates = getClassMeetingDates(schoolYear, { cycleDays: [1] }, [
      { cycleDay: 1, startDate: "2026-09-07", endDate: "2026-09-14" },
    ]);
    expect(dates).not.toContain("2026-09-01");
    expect(dates).not.toContain("2026-09-03");
  });

  it("unions multiple slots, including ones with no date bounds (regular slots)", () => {
    const dates = getClassMeetingDates(schoolYear, { cycleDays: [1] }, [
      { cycleDay: 1, startDate: undefined, endDate: undefined },
      { cycleDay: 2, startDate: "2026-09-09", endDate: "2026-09-11" },
    ]);
    expect(dates).toEqual([
      "2026-09-01",
      "2026-09-03",
      "2026-09-07",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-14",
    ]);
  });

  it("falls back to cycleDays-only behavior when scheduleSlots is omitted or empty", () => {
    const dates = getClassMeetingDates(schoolYear, { cycleDays: [1] }, []);
    expect(dates).toEqual(["2026-09-01", "2026-09-03", "2026-09-07", "2026-09-10", "2026-09-14"]);
  });
});

describe("getNextClassMeetingDate", () => {
  it("finds the next date the class meets after a given date", () => {
    expect(getNextClassMeetingDate(schoolYear, { cycleDays: [1] }, "2026-09-03")).toBe(
      "2026-09-07",
    );
  });

  it("returns undefined when there are no more meeting days in the year", () => {
    expect(getNextClassMeetingDate(schoolYear, { cycleDays: [1] }, "2026-09-14")).toBeUndefined();
  });

  it("respects a scheduleSlots date window when given", () => {
    expect(
      getNextClassMeetingDate(schoolYear, { cycleDays: [1] }, "2026-09-01", [
        { cycleDay: 1, startDate: "2026-09-07", endDate: "2026-09-14" },
      ]),
    ).toBe("2026-09-07");
  });
});

describe("getDayLabel", () => {
  it("labels numerically by default", () => {
    expect(getDayLabel("numeric", 1)).toBe("Day 1");
    expect(getDayLabel("numeric", 6)).toBe("Day 6");
  });

  it("labels with letters", () => {
    expect(getDayLabel("letters", 1)).toBe("Day A");
    expect(getDayLabel("letters", 2)).toBe("Day B");
    expect(getDayLabel("letters", 26)).toBe("Day Z");
    expect(getDayLabel("letters", 27)).toBe("Day AA");
  });

  it("labels odd/even for the first two cycle days", () => {
    expect(getDayLabel("odd-even", 1)).toBe("Odd Day");
    expect(getDayLabel("odd-even", 2)).toBe("Even Day");
  });

  it("falls back to numeric for odd-even beyond a 2-day cycle", () => {
    expect(getDayLabel("odd-even", 3)).toBe("Day 3");
  });
});

describe("getDayInfo", () => {
  const numericSchoolYear = { ...schoolYear, dayLabelScheme: "numeric" as const };

  it("labels an instructional day with its cycle day", () => {
    expect(getDayInfo(numericSchoolYear, "2026-09-01")).toEqual({
      kind: "instructional",
      cycleDay: 1,
      label: "Day 1",
    });
  });

  it("labels a blocked day with its own label, not a cycle day", () => {
    expect(getDayInfo(numericSchoolYear, "2026-09-04")).toEqual({
      kind: "blocked",
      label: "PD Day",
    });
  });

  it("labels a weekend distinctly, even one with no blocked-date entry", () => {
    expect(getDayInfo(numericSchoolYear, "2026-09-05")).toEqual({ kind: "weekend" });
  });

  it("returns undefined outside the school year's range", () => {
    expect(getDayInfo(numericSchoolYear, "2026-10-01")).toBeUndefined();
  });
});
