import type { InstructionalDay, SchoolYear, UnitPlan } from "./types";

const weekdayFormatter = new Intl.DateTimeFormat("en-CA", {
  weekday: "short",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  timeZone: "UTC",
});

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function buildInstructionalDays(
  schoolYear: Pick<SchoolYear, "startDate" | "endDate" | "blockedDates">,
): InstructionalDay[] {
  const blockedDates = new Set(schoolYear.blockedDates);
  const days: InstructionalDay[] = [];

  for (
    let date = parseDate(schoolYear.startDate);
    date <= parseDate(schoolYear.endDate);
    date = addDays(date, 1)
  ) {
    const key = toDateKey(date);

    if (isWeekend(date) || blockedDates.has(key)) {
      continue;
    }

    days.push({
      date,
      key,
      label: `${weekdayFormatter.format(date)} ${date.getUTCDate()}`,
      monthLabel: monthFormatter.format(date),
    });
  }

  return days;
}

export function getUnitTimelinePosition(
  unit: UnitPlan,
  instructionalDays: InstructionalDay[],
): {
  gridColumnStart: number;
  gridColumnSpan: number;
  instructionalDays: number;
} {
  const coveredDays = instructionalDays.filter(
    (day) => day.key >= unit.startDate && day.key <= unit.endDate,
  );

  if (coveredDays.length === 0) {
    return {
      gridColumnStart: 1,
      gridColumnSpan: 1,
      instructionalDays: 0,
    };
  }

  const firstIndex = instructionalDays.findIndex(
    (day) => day.key === coveredDays[0]?.key,
  );

  return {
    gridColumnStart: firstIndex + 1,
    gridColumnSpan: coveredDays.length,
    instructionalDays: coveredDays.length,
  };
}
