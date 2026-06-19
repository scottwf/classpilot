import { describe, expect, it } from "vitest";
import { scheduleLessonDates } from "./schedule";

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

describe("scheduleLessonDates", () => {
  it("returns an empty array for zero lessons", () => {
    expect(scheduleLessonDates(days, "2026-09-07", 0, 3)).toEqual([]);
  });

  it("spaces ~3 lessons/week with a stride", () => {
    const result = scheduleLessonDates(days, "2026-09-07", 3, 3);
    // stride = round(5/3) = 2 -> Mon, Wed, Fri.
    expect(result).toEqual(["2026-09-07", "2026-09-09", "2026-09-11"]);
  });

  it("uses every instructional day when lessonsPerWeek is 5", () => {
    const result = scheduleLessonDates(days, "2026-09-07", 5, 5);
    expect(result).toEqual(days.slice(0, 5));
  });

  it("starts on or after the requested start date", () => {
    const result = scheduleLessonDates(days, "2026-09-14", 2, 5);
    expect(result.every((key) => key >= "2026-09-14")).toBe(true);
    expect(result).toEqual(["2026-09-14", "2026-09-15"]);
  });

  it("backfills skipped days before stacking when count exceeds strided picks", () => {
    const result = scheduleLessonDates(days, "2026-09-07", 8, 1);
    // 8 distinct days requested; all should be unique and in range.
    expect(new Set(result).size).toBe(8);
    expect(result).toHaveLength(8);
  });

  it("stacks overflow on the last day when lessons exceed available days", () => {
    const result = scheduleLessonDates(days, "2026-09-07", 12, 5);
    expect(result).toHaveLength(12);
    expect(result[result.length - 1]).toBe("2026-09-18");
  });

  it("falls back to the start date when no instructional days remain", () => {
    const result = scheduleLessonDates(days, "2027-01-01", 3, 3);
    expect(result).toEqual(["2027-01-01", "2027-01-01", "2027-01-01"]);
  });

  it("returns dates in ascending order", () => {
    const result = scheduleLessonDates(days, "2026-09-07", 4, 2);
    const sorted = [...result].sort();
    expect(result).toEqual(sorted);
  });
});
