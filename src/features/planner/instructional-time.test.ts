import { describe, expect, it } from "vitest";
import {
  computeInstructionalTimeSummary,
  computeScheduledMinutesForClass,
} from "./instructional-time";

// Same fixture as cycle.test.ts: cycle day 1 lands on 5 instructional dates
// (09-01, 09-03, 09-07, 09-10, 09-14), cycle day 2 on 3 (09-02, 09-09, 09-11).
const schoolYear = {
  startDate: "2026-09-01",
  endDate: "2026-09-14",
  cycleLength: 2,
  blockedDates: [
    { date: "2026-09-04", label: "PD Day", advancesCycle: true },
    { date: "2026-09-08", label: "Snow Day", advancesCycle: false },
  ],
};

describe("computeScheduledMinutesForClass", () => {
  it("multiplies a slot's duration by how many times its cycle day occurs", () => {
    const scheduleSlots = [
      { classId: "class-1", cycleDay: 1, startTime: "09:00", endTime: "09:50" }, // 50 min
    ];

    // 50 minutes x 5 occurrences of cycle day 1.
    expect(computeScheduledMinutesForClass(schoolYear, "class-1", scheduleSlots)).toBe(250);
  });

  it("sums across multiple slots for the same class", () => {
    const scheduleSlots = [
      { classId: "class-1", cycleDay: 1, startTime: "09:00", endTime: "09:50" }, // 50 min
      { classId: "class-1", cycleDay: 2, startTime: "10:00", endTime: "10:40" }, // 40 min
    ];

    // (50 x 5) + (40 x 3) = 250 + 120.
    expect(computeScheduledMinutesForClass(schoolYear, "class-1", scheduleSlots)).toBe(370);
  });

  it("ignores slots belonging to other classes", () => {
    const scheduleSlots = [
      { classId: "class-1", cycleDay: 1, startTime: "09:00", endTime: "09:50" },
      { classId: "class-2", cycleDay: 2, startTime: "10:00", endTime: "10:40" },
    ];

    expect(computeScheduledMinutesForClass(schoolYear, "class-1", scheduleSlots)).toBe(250);
  });

  it("returns 0 for a class with no scheduled slots", () => {
    expect(computeScheduledMinutesForClass(schoolYear, "class-1", [])).toBe(0);
  });
});

describe("computeInstructionalTimeSummary", () => {
  it("flags a class as meeting its target when scheduled minutes are enough", () => {
    const classes = [{ id: "class-1", targetMinutesPerYear: 200 }];
    const scheduleSlots = [
      { classId: "class-1", cycleDay: 1, startTime: "09:00", endTime: "09:50" },
    ];

    const [summary] = computeInstructionalTimeSummary(schoolYear, classes, scheduleSlots);

    expect(summary).toEqual({
      classId: "class-1",
      scheduledMinutes: 250,
      targetMinutesPerYear: 200,
      meetsTarget: true,
    });
  });

  it("flags a class as under target when scheduled minutes fall short", () => {
    const classes = [{ id: "class-1", targetMinutesPerYear: 300 }];
    const scheduleSlots = [
      { classId: "class-1", cycleDay: 1, startTime: "09:00", endTime: "09:50" },
    ];

    const [summary] = computeInstructionalTimeSummary(schoolYear, classes, scheduleSlots);

    expect(summary.meetsTarget).toBe(false);
    expect(summary.scheduledMinutes).toBe(250);
  });

  it("treats a class with no target as always meeting it (informational only)", () => {
    const classes = [{ id: "class-1", targetMinutesPerYear: undefined }];

    const [summary] = computeInstructionalTimeSummary(schoolYear, classes, []);

    expect(summary.meetsTarget).toBe(true);
    expect(summary.scheduledMinutes).toBe(0);
  });

  it("computes a separate summary entry per class", () => {
    const classes = [
      { id: "class-1", targetMinutesPerYear: 100 },
      { id: "class-2", targetMinutesPerYear: 100 },
    ];
    const scheduleSlots = [
      { classId: "class-1", cycleDay: 1, startTime: "09:00", endTime: "09:50" },
      { classId: "class-2", cycleDay: 2, startTime: "10:00", endTime: "10:40" },
    ];

    const summary = computeInstructionalTimeSummary(schoolYear, classes, scheduleSlots);

    expect(summary.map((entry) => entry.classId)).toEqual(["class-1", "class-2"]);
    expect(summary[0].scheduledMinutes).toBe(250);
    expect(summary[1].scheduledMinutes).toBe(120);
  });
});
