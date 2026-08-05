import { describe, expect, it } from "vitest";
import { computeCascadeShift, shiftDateByInstructionalDays } from "./reschedule";

// Two school weeks, Mon-Fri (weekends already excluded).
const days = [
  "2026-09-07",
  "2026-09-08",
  "2026-09-09",
  "2026-09-10",
  "2026-09-11",
  "2026-09-14",
  "2026-09-15",
  "2026-09-16",
  "2026-09-17",
  "2026-09-18",
];

describe("shiftDateByInstructionalDays", () => {
  it("shifts forward by the requested number of instructional days", () => {
    expect(shiftDateByInstructionalDays("2026-09-07", days, 2)).toBe("2026-09-09");
  });

  it("shifts backward by the requested number of instructional days", () => {
    expect(shiftDateByInstructionalDays("2026-09-11", days, -2)).toBe("2026-09-09");
  });

  it("returns the same date when shiftBy is 0", () => {
    expect(shiftDateByInstructionalDays("2026-09-09", days, 0)).toBe("2026-09-09");
  });

  it("clamps to the last instructional day on overflow", () => {
    expect(shiftDateByInstructionalDays("2026-09-17", days, 5)).toBe("2026-09-18");
  });

  it("clamps to the first instructional day when shifting before the year starts", () => {
    expect(shiftDateByInstructionalDays("2026-09-08", days, -5)).toBe("2026-09-07");
  });

  it("anchors from the next instructional day when the date isn't one (e.g. a weekend)", () => {
    // 2026-09-12/13 is a weekend, not in `days`; nearest instructional day
    // on/after it is 2026-09-14, so +1 lands on 2026-09-15.
    expect(shiftDateByInstructionalDays("2026-09-12", days, 1)).toBe("2026-09-15");
  });

  it("returns the input date unchanged when there are no instructional days", () => {
    expect(shiftDateByInstructionalDays("2026-09-07", [], 3)).toBe("2026-09-07");
  });
});

describe("computeCascadeShift", () => {
  const lessons = [
    { id: "lesson-1", date: "2026-09-07" },
    { id: "lesson-2", date: "2026-09-09" },
    { id: "lesson-3", date: "2026-09-11" },
    { id: "lesson-4", date: "2026-09-15" },
  ];

  it("shifts only lessons on/after fromDate, preserving relative spacing", () => {
    const result = computeCascadeShift(lessons, "2026-09-09", days, 1);

    expect(result).toEqual([
      { id: "lesson-2", date: "2026-09-10" },
      { id: "lesson-3", date: "2026-09-14" },
      { id: "lesson-4", date: "2026-09-16" },
    ]);
  });

  it("leaves earlier lessons out of the result entirely", () => {
    const result = computeCascadeShift(lessons, "2026-09-09", days, 1);
    expect(result.some((shift) => shift.id === "lesson-1")).toBe(false);
  });

  it("returns an empty array when no lessons are on/after fromDate", () => {
    expect(computeCascadeShift(lessons, "2026-10-01", days, 1)).toEqual([]);
  });

  it("supports negative shifts to pull lessons earlier", () => {
    const result = computeCascadeShift(lessons, "2026-09-09", days, -1);

    expect(result).toEqual([
      { id: "lesson-2", date: "2026-09-08" },
      { id: "lesson-3", date: "2026-09-10" },
      { id: "lesson-4", date: "2026-09-14" },
    ]);
  });
});
