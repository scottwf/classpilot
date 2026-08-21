import { describe, expect, it } from "vitest";
import {
  buildMiniCalendarDays,
  monthKeyFromDate,
  monthLabel,
  shiftMonthKey,
} from "./mini-calendar";

describe("buildMiniCalendarDays", () => {
  it("fills full weeks around the month, including leading/trailing days", () => {
    // September 2026: 1st is a Tuesday, 30th is a Wednesday.
    const days = buildMiniCalendarDays("2026-09");

    expect(days.length % 7).toBe(0);
    expect(days[0].date).toBe("2026-08-30"); // grid starts on the Sunday before Sept 1
    expect(days[0].inCurrentMonth).toBe(false);
    expect(days.at(-1)?.inCurrentMonth).toBe(false); // trailing October days

    const septemberFirst = days.find((day) => day.date === "2026-09-01");
    expect(septemberFirst?.inCurrentMonth).toBe(true);
    expect(septemberFirst?.dayOfMonth).toBe(1);
  });

  it("always produces complete weeks (multiple of 7 days)", () => {
    // February 2027 is not a leap year and starts on a Monday -- a good
    // edge case for the grid-fill math.
    expect(buildMiniCalendarDays("2027-02").length % 7).toBe(0);
  });
});

describe("monthKeyFromDate", () => {
  it("extracts YYYY-MM from a date key", () => {
    expect(monthKeyFromDate("2026-09-15")).toBe("2026-09");
  });
});

describe("monthLabel", () => {
  it("formats a month key as a readable label", () => {
    expect(monthLabel("2026-09")).toBe("September 2026");
  });
});

describe("shiftMonthKey", () => {
  it("shifts forward within a year", () => {
    expect(shiftMonthKey("2026-09", 1)).toBe("2026-10");
  });

  it("shifts backward across a year boundary", () => {
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  });

  it("shifts forward across a year boundary", () => {
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
  });
});
