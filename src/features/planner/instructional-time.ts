import type { ClassSection, Period, ScheduleSlot, SchoolYear } from "./types";
import { buildCycleDayMap } from "./cycle";

type TimeSchoolYear = Pick<SchoolYear, "startDate" | "endDate" | "blockedDates" | "cycleLength">;

function periodDurationMinutes(period: Pick<Period, "startTime" | "endTime">): number {
  const [startHour, startMinute] = period.startTime.split(":").map(Number);
  const [endHour, endMinute] = period.endTime.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

/** How many instructional-day occurrences each cycle day number has between
 * the school year's start and end date (e.g. cycle day 1 might land on 15
 * actual calendar dates across a semester). */
function countCycleDayOccurrences(schoolYear: TimeSchoolYear): Map<number, number> {
  const counts = new Map<number, number>();

  for (const cycleDay of buildCycleDayMap(schoolYear).values()) {
    counts.set(cycleDay, (counts.get(cycleDay) ?? 0) + 1);
  }

  return counts;
}

/**
 * Total scheduled instructional minutes for one class across the school
 * year, based on its actual schedule_slots (not just cycleDays membership,
 * which only says which days a class meets, not for how long) — each
 * slot's period duration times how many times that cycle day actually
 * occurs between the school year's start and end date.
 */
export function computeScheduledMinutesForClass(
  schoolYear: TimeSchoolYear,
  classId: string,
  periods: Pick<Period, "id" | "startTime" | "endTime">[],
  scheduleSlots: Pick<ScheduleSlot, "classId" | "periodId" | "cycleDay">[],
): number {
  const occurrences = countCycleDayOccurrences(schoolYear);
  const periodById = new Map(periods.map((period) => [period.id, period]));

  return scheduleSlots
    .filter((slot) => slot.classId === classId)
    .reduce((total, slot) => {
      const period = periodById.get(slot.periodId);
      if (!period) {
        return total;
      }
      const occurrenceCount = occurrences.get(slot.cycleDay) ?? 0;
      return total + periodDurationMinutes(period) * occurrenceCount;
    }, 0);
}

export type ClassInstructionalTime = {
  classId: string;
  scheduledMinutes: number;
  targetMinutesPerYear?: number;
  /** True when there's no target to check against, or the scheduled time
   * meets or exceeds it. */
  meetsTarget: boolean;
};

/**
 * Per-class scheduled-vs-target instructional time for a whole school year
 * — the numbers the onboarding wizard's final confirmation step shows.
 */
export function computeInstructionalTimeSummary(
  schoolYear: TimeSchoolYear,
  classes: Pick<ClassSection, "id" | "targetMinutesPerYear">[],
  periods: Pick<Period, "id" | "startTime" | "endTime">[],
  scheduleSlots: Pick<ScheduleSlot, "classId" | "periodId" | "cycleDay">[],
): ClassInstructionalTime[] {
  return classes.map((classSection) => {
    const scheduledMinutes = computeScheduledMinutesForClass(
      schoolYear,
      classSection.id,
      periods,
      scheduleSlots,
    );
    const targetMinutesPerYear = classSection.targetMinutesPerYear;

    return {
      classId: classSection.id,
      scheduledMinutes,
      targetMinutesPerYear,
      meetsTarget: targetMinutesPerYear === undefined || scheduledMinutes >= targetMinutesPerYear,
    };
  });
}
