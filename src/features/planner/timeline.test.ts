import { describe, expect, it } from "vitest";
import {
  buildInstructionalDays,
  getUnitTimelinePosition,
  toDateKey,
} from "./timeline";

describe("planner timeline", () => {
  it("builds instructional days without weekends or blocked dates", () => {
    const days = buildInstructionalDays({
      startDate: "2026-09-01",
      endDate: "2026-09-10",
      blockedDates: [{ date: "2026-09-07", label: "Labour Day", advancesCycle: true }],
    });

    expect(days.map((day) => toDateKey(day.date))).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
    ]);
  });

  it("converts a unit date range into grid start and span", () => {
    const days = buildInstructionalDays({
      startDate: "2026-09-01",
      endDate: "2026-09-14",
      blockedDates: [{ date: "2026-09-07", label: "Labour Day", advancesCycle: true }],
    });

    expect(
      getUnitTimelinePosition(
        {
          id: "unit-1",
          classId: "science-9",
          title: "Ecosystems",
          startDate: "2026-09-03",
          endDate: "2026-09-11",
          outcomeIds: [],
          lessons: [],
          notes: "",
        },
        days,
      ),
    ).toEqual({
      gridColumnStart: 3,
      gridColumnSpan: 6,
      instructionalDays: 6,
    });
  });
});
