import { describe, expect, it } from "vitest";
import { buildIcsCalendar } from "./ics";
import type { EnrichedLesson } from "@/src/features/planner/lesson-queries";

function lesson(overrides: Partial<EnrichedLesson> = {}): EnrichedLesson {
  return {
    id: "lesson-1",
    title: "Ratio Language",
    date: "2026-09-15",
    durationMinutes: 45,
    status: "planned",
    outcomeIds: [],
    summary: "Introduce ratio vocabulary.",
    classId: "grade-6-math",
    className: "Grade 6 Math",
    subject: "Math",
    unitId: "unit-ratios",
    unitTitle: "Ratios, Rates, and Percent",
    outcomeCodes: [],
    ...overrides,
  };
}

const now = new Date("2026-09-01T12:00:00.000Z");

describe("buildIcsCalendar", () => {
  it("produces a valid, empty VCALENDAR when there are no lessons", () => {
    const ics = buildIcsCalendar({ calendarName: "ClassPilot", lessons: [], now });

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("emits one all-day VEVENT per lesson with a DTEND one day after DTSTART", () => {
    const ics = buildIcsCalendar({ calendarName: "ClassPilot", lessons: [lesson()], now });

    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:lesson-1@classpilot");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260915");
    expect(ics).toContain("DTEND;VALUE=DATE:20260916");
    expect(ics).toContain("DTSTAMP:20260901T120000Z");
    expect(ics).toContain("SUMMARY:Math: Ratio Language");
  });

  it("includes unit title, status, and summary in the description", () => {
    const ics = buildIcsCalendar({ calendarName: "ClassPilot", lessons: [lesson()], now });

    expect(ics).toMatch(/DESCRIPTION:Unit: Ratios\\, Rates\\, and Percent\\nStatus: planned/);
  });

  it("escapes commas, semicolons, and backslashes per RFC 5545", () => {
    const ics = buildIcsCalendar({
      calendarName: "ClassPilot",
      lessons: [lesson({ title: "Fractions; Decimals, and \\Percents\\" })],
      now,
    });

    expect(ics).toContain("SUMMARY:Math: Fractions\\; Decimals\\, and \\\\Percents\\\\");
  });

  it("folds lines longer than 75 characters onto continuation lines", () => {
    const longSummary = "A".repeat(120);
    const ics = buildIcsCalendar({
      calendarName: "ClassPilot",
      lessons: [lesson({ summary: longSummary })],
      now,
    });

    const rawLines = ics.split("\r\n");
    // No line (other than the final trailing blank from the closing \r\n)
    // should exceed the fold limit.
    for (const line of rawLines) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
    // Continuation lines start with a single space.
    expect(rawLines.some((line) => line.startsWith(" "))).toBe(true);
  });

  it("orders multiple lessons as given, one VEVENT block each", () => {
    const ics = buildIcsCalendar({
      calendarName: "ClassPilot",
      lessons: [lesson({ id: "lesson-1" }), lesson({ id: "lesson-2", date: "2026-09-16" })],
      now,
    });

    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.indexOf("lesson-1@classpilot")).toBeLessThan(ics.indexOf("lesson-2@classpilot"));
  });
});
