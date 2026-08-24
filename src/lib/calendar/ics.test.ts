import { describe, expect, it } from "vitest";
import {
  buildClassScheduleIcsCalendar,
  buildDayCycleIcsCalendar,
  buildIcsCalendar,
} from "./ics";
import type { EnrichedLesson } from "@/src/features/planner/lesson-queries";
import type { ClassSection, ScheduleSlot } from "@/src/features/planner/types";

function lesson(overrides: Partial<EnrichedLesson> = {}): EnrichedLesson {
  return {
    id: "lesson-1",
    title: "Ratio Language",
    date: "2026-09-15",
    sequence: 1,
    durationMinutes: 45,
    status: "planned",
    outcomeIds: [],
    summary: "Introduce ratio vocabulary.",
    classId: "grade-6-math",
    className: "Grade 6 Math",
    subject: "Math",
    grade: "6",
    classColor: "blue",
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

// 2026-09-01 is a Tuesday -- Tue/Wed/Thu/Fri that week, cycleLength 2 gives
// cycle days A,B,A,B for Tue-Fri, then A again for the following Monday.
const scheduleFeedSchoolYear = {
  startDate: "2026-09-01",
  endDate: "2026-09-08",
  blockedDates: [],
  cycleLength: 2,
  dayLabelScheme: "letters" as const,
};

function classSection(overrides: Partial<ClassSection> = {}): ClassSection {
  return {
    id: "class-math",
    schoolYearId: "current",
    name: "Grade 6 Math",
    subject: "Math",
    grade: "6",
    room: "",
    meetingPattern: "",
    cycleDays: [],
    color: "blue",
    isInstructional: true,
    ...overrides,
  };
}

function scheduleSlot(overrides: Partial<ScheduleSlot> = {}): ScheduleSlot {
  return {
    id: "slot-1",
    classId: "class-math",
    cycleDay: 1,
    startTime: "09:00",
    endTime: "09:45",
    ...overrides,
  };
}

describe("buildDayCycleIcsCalendar", () => {
  it("emits one all-day VEVENT per instructional day, labelled by cycle day", () => {
    const ics = buildDayCycleIcsCalendar({
      calendarName: "ClassPilot — Day Cycle",
      schoolYear: scheduleFeedSchoolYear,
      now,
    });

    expect(ics).toContain("DTSTART;VALUE=DATE:20260901");
    expect(ics).toContain("SUMMARY:Day A");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260902");
    expect(ics).toContain("SUMMARY:Day B");
    // Weekend (Sep 5-6) is skipped entirely.
    expect(ics).not.toContain("DTSTART;VALUE=DATE:20260905");
    expect(ics).not.toContain("DTSTART;VALUE=DATE:20260906");
  });
});

describe("buildClassScheduleIcsCalendar", () => {
  it("emits a timed VEVENT per class occurrence across the school year", () => {
    const ics = buildClassScheduleIcsCalendar({
      calendarName: "ClassPilot — All Classes",
      classes: [classSection()],
      scheduleSlots: [scheduleSlot()],
      schoolYear: scheduleFeedSchoolYear,
      now,
    });

    // Cycle day 1 lands on 2026-09-01 and 2026-09-03 (Tue, Thu).
    expect(ics).toContain("DTSTART:20260901T090000");
    expect(ics).toContain("DTEND:20260901T094500");
    expect(ics).toContain("DTSTART:20260903T090000");
    expect(ics).toContain("SUMMARY:Grade 6 Math");
    expect(ics).not.toContain("VALUE=DATE");
  });

  it("filters to only non-instructional classes when instructionalOnly is false", () => {
    const classes = [
      classSection({ id: "class-math", isInstructional: true }),
      classSection({ id: "class-recess", name: "Recess Supervision", isInstructional: false }),
    ];
    const slots = [
      scheduleSlot({ id: "slot-math", classId: "class-math" }),
      scheduleSlot({
        id: "slot-recess",
        classId: "class-recess",
        startTime: "12:00",
        endTime: "12:15",
      }),
    ];

    const ics = buildClassScheduleIcsCalendar({
      calendarName: "ClassPilot — Supervision",
      classes,
      instructionalOnly: false,
      scheduleSlots: slots,
      schoolYear: scheduleFeedSchoolYear,
      now,
    });

    expect(ics).toContain("SUMMARY:Recess Supervision");
    expect(ics).not.toContain("SUMMARY:Grade 6 Math");
  });

  it("includes every class when instructionalOnly is omitted", () => {
    const classes = [
      classSection({ id: "class-math", isInstructional: true }),
      classSection({ id: "class-recess", name: "Recess Supervision", isInstructional: false }),
    ];
    const slots = [
      scheduleSlot({ id: "slot-math", classId: "class-math" }),
      scheduleSlot({
        id: "slot-recess",
        classId: "class-recess",
        startTime: "12:00",
        endTime: "12:15",
      }),
    ];

    const ics = buildClassScheduleIcsCalendar({
      calendarName: "ClassPilot — All Classes",
      classes,
      scheduleSlots: slots,
      schoolYear: scheduleFeedSchoolYear,
      now,
    });

    expect(ics).toContain("SUMMARY:Recess Supervision");
    expect(ics).toContain("SUMMARY:Grade 6 Math");
  });
});
