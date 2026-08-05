import type { ClassSection, SchoolYear } from "./types";

type CycleSchoolYear = Pick<SchoolYear, "startDate" | "endDate" | "blockedDates" | "cycleLength">;
type CycleClassSection = Pick<ClassSection, "cycleDays">;

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

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Maps every instructional day in the school year to its cycle day number
 * (1..cycleLength). A non-instructional day consumes a cycle number (the
 * next instructional day picks up the following number) only when its
 * `advancesCycle` flag is true; otherwise the cycle pauses and the next
 * instructional day repeats the number that day would have had. Weekends
 * never advance or consume a number.
 */
export function buildCycleDayMap(schoolYear: CycleSchoolYear): Map<string, number> {
  const blockedByDate = new Map(schoolYear.blockedDates.map((day) => [day.date, day]));
  const cycleDayMap = new Map<string, number>();
  const cycleLength = Math.max(1, schoolYear.cycleLength);
  let cycleCounter = 0;

  for (
    let date = parseDate(schoolYear.startDate);
    date <= parseDate(schoolYear.endDate);
    date = addDays(date, 1)
  ) {
    if (isWeekend(date)) {
      continue;
    }

    const key = toDateKey(date);
    const blocked = blockedByDate.get(key);

    if (blocked) {
      if (blocked.advancesCycle) {
        cycleCounter += 1;
      }
      continue;
    }

    cycleCounter += 1;
    cycleDayMap.set(key, ((cycleCounter - 1) % cycleLength) + 1);
  }

  return cycleDayMap;
}

export function getCycleDayForDate(
  schoolYear: CycleSchoolYear,
  dateKey: string,
): number | undefined {
  return buildCycleDayMap(schoolYear).get(dateKey);
}

/**
 * Every instructional day this class meets on, ascending. An empty
 * `cycleDays` means the class meets every instructional day — the right
 * default for a school with no rotating cycle, and for existing classes
 * created before cycle days existed.
 */
export function getClassMeetingDates(
  schoolYear: CycleSchoolYear,
  classSection: CycleClassSection,
): string[] {
  const cycleDayMap = buildCycleDayMap(schoolYear);
  const meetsEveryDay = classSection.cycleDays.length === 0;
  const cycleDaySet = new Set(classSection.cycleDays);

  return Array.from(cycleDayMap.entries())
    .filter(([, cycleDay]) => meetsEveryDay || cycleDaySet.has(cycleDay))
    .map(([date]) => date)
    .sort();
}

/**
 * The next date this class meets strictly after `afterDate`, or undefined
 * if the class has no more meeting days in the school year.
 */
export function getNextClassMeetingDate(
  schoolYear: CycleSchoolYear,
  classSection: CycleClassSection,
  afterDate: string,
): string | undefined {
  return getClassMeetingDates(schoolYear, classSection).find((date) => date > afterDate);
}
