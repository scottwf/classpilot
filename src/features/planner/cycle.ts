import type { ClassSection, DayLabelScheme, ScheduleSlot, SchoolYear } from "./types";

type CycleSchoolYear = Pick<SchoolYear, "startDate" | "endDate" | "blockedDates" | "cycleLength">;
type CycleClassSection = Pick<ClassSection, "cycleDays">;
type CycleScheduleSlot = Pick<ScheduleSlot, "cycleDay" | "startDate" | "endDate">;

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
/**
 * When `scheduleSlots` is given and non-empty, meeting dates are derived
 * directly from the actual slots (including a temporary/burst slot's own
 * date window — see addTemporaryScheduleSlot in schedule-repository.ts),
 * which is the only way to get this right for a class scheduled *only*
 * via temporary slots (a mid-year-start class, or one that alternates by
 * month with no permanent slot at all): its `cycleDays` snapshot alone
 * can't express "only during these months." Falls back to the
 * `cycleDays`-only behavior (empty means "meets every instructional day")
 * when no slots are passed, for a class that hasn't been scheduled at all
 * yet.
 */
export function getClassMeetingDates(
  schoolYear: CycleSchoolYear,
  classSection: CycleClassSection,
  scheduleSlots: CycleScheduleSlot[] = [],
): string[] {
  const cycleDayMap = buildCycleDayMap(schoolYear);

  if (scheduleSlots.length > 0) {
    return Array.from(cycleDayMap.entries())
      .filter(([date, cycleDay]) =>
        scheduleSlots.some(
          (slot) =>
            slot.cycleDay === cycleDay &&
            (!slot.startDate || date >= slot.startDate) &&
            (!slot.endDate || date <= slot.endDate),
        ),
      )
      .map(([date]) => date)
      .sort();
  }

  const meetsEveryDay = classSection.cycleDays.length === 0;
  const cycleDaySet = new Set(classSection.cycleDays);

  return Array.from(cycleDayMap.entries())
    .filter(([, cycleDay]) => meetsEveryDay || cycleDaySet.has(cycleDay))
    .map(([date]) => date)
    .sort();
}

const letterForCycleDay = (cycleDay: number): string => {
  // 1 -> A, 2 -> B, ... 26 -> Z, 27 -> AA, matching spreadsheet column
  // naming — a school's cycle length realistically never gets close to 26,
  // but this avoids silently breaking instead of just looking odd.
  let n = cycleDay;
  let label = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
};

/**
 * Cosmetic display label for a cycle day number — never affects storage or
 * any scheduling/cycle calculation, which always use plain numbers
 * (1..cycleLength). "odd-even" only really makes sense for a 2-day cycle;
 * beyond cycle day 2 it falls back to the plain numeric label.
 */
export function getDayLabel(scheme: DayLabelScheme, cycleDay: number): string {
  if (scheme === "letters") {
    return `Day ${letterForCycleDay(cycleDay)}`;
  }
  if (scheme === "odd-even") {
    if (cycleDay === 1) return "Odd Day";
    if (cycleDay === 2) return "Even Day";
  }
  return `Day ${cycleDay}`;
}

/**
 * The next date this class meets strictly after `afterDate`, or undefined
 * if the class has no more meeting days in the school year.
 */
export function getNextClassMeetingDate(
  schoolYear: CycleSchoolYear,
  classSection: CycleClassSection,
  afterDate: string,
  scheduleSlots: CycleScheduleSlot[] = [],
): string | undefined {
  return getClassMeetingDates(schoolYear, classSection, scheduleSlots).find(
    (date) => date > afterDate,
  );
}
