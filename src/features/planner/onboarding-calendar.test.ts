import { describe, expect, it } from "vitest";
import { buildMonthGrids, selectDateRange } from "./onboarding-calendar";

describe("buildMonthGrids", () => {
  it("returns one grid per month spanning the date range", () => {
    // 2026-09-01 is a Tuesday; 2026-10-16 is within October.
    const grids = buildMonthGrids("2026-09-01", "2026-10-16");

    expect(grids.map((grid) => grid.label)).toEqual(["September 2026", "October 2026"]);
  });

  it("pads leading blanks so the 1st lands on its correct weekday column", () => {
    // September 1, 2026 is a Tuesday -> 2 leading blanks (Sun, Mon).
    const [september] = buildMonthGrids("2026-09-01", "2026-09-30");

    expect(september.weeks[0]).toEqual([
      null,
      null,
      { date: "2026-09-01", inRange: true, isWeekend: false },
      { date: "2026-09-02", inRange: true, isWeekend: false },
      { date: "2026-09-03", inRange: true, isWeekend: false },
      { date: "2026-09-04", inRange: true, isWeekend: false },
      { date: "2026-09-05", inRange: true, isWeekend: true },
    ]);
  });

  it("every week row has exactly 7 cells", () => {
    const [september] = buildMonthGrids("2026-09-01", "2026-09-30");

    for (const week of september.weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it("flags days outside the [start, end] range as inRange: false", () => {
    // Range starts mid-month; earlier days in that month grid are still
    // rendered (so the month isn't visually cut off) but marked out of range.
    const [september] = buildMonthGrids("2026-09-10", "2026-09-30");
    const day1 = september.weeks.flat().find((cell) => cell?.date === "2026-09-01");
    const day10 = september.weeks.flat().find((cell) => cell?.date === "2026-09-10");

    expect(day1?.inRange).toBe(false);
    expect(day10?.inRange).toBe(true);
  });

  it("flags Saturday and Sunday as weekends", () => {
    const [september] = buildMonthGrids("2026-09-01", "2026-09-30");
    const saturday = september.weeks.flat().find((cell) => cell?.date === "2026-09-05");
    const monday = september.weeks.flat().find((cell) => cell?.date === "2026-09-07");

    expect(saturday?.isWeekend).toBe(true);
    expect(monday?.isWeekend).toBe(false);
  });

  it("returns an empty array when dates are missing or invalid", () => {
    expect(buildMonthGrids("", "")).toEqual([]);
    expect(buildMonthGrids("2026-09-01", "")).toEqual([]);
    expect(buildMonthGrids("2026-09-30", "2026-09-01")).toEqual([]);
  });

  it("handles a single-day range within one month", () => {
    const grids = buildMonthGrids("2026-09-15", "2026-09-15");

    expect(grids).toHaveLength(1);
    const inRangeDates = grids[0].weeks
      .flat()
      .filter((cell): cell is NonNullable<typeof cell> => cell !== null && cell.inRange)
      .map((cell) => cell.date);
    expect(inRangeDates).toEqual(["2026-09-15"]);
  });
});

describe("selectDateRange", () => {
  const grids = buildMonthGrids("2026-09-01", "2026-09-30");

  it("returns every clickable weekday between two dates, skipping weekends", () => {
    // Sep 4 is a Friday, Sep 8 is a Tuesday — Sep 5-6 is a weekend.
    expect(selectDateRange(grids, "2026-09-04", "2026-09-08")).toEqual([
      "2026-09-04",
      "2026-09-07",
      "2026-09-08",
    ]);
  });

  it("is order-independent (anchor after target still works)", () => {
    expect(selectDateRange(grids, "2026-09-08", "2026-09-04")).toEqual([
      "2026-09-04",
      "2026-09-07",
      "2026-09-08",
    ]);
  });

  it("returns a single date when anchor and target are the same", () => {
    expect(selectDateRange(grids, "2026-09-15", "2026-09-15")).toEqual(["2026-09-15"]);
  });

  it("excludes days outside the calendar's [start, end] range", () => {
    const partialGrids = buildMonthGrids("2026-09-10", "2026-09-30");

    // Sep 8 is out of range for this calendar (starts Sep 10).
    expect(selectDateRange(partialGrids, "2026-09-08", "2026-09-11")).toEqual(["2026-09-10", "2026-09-11"]);
  });
});
