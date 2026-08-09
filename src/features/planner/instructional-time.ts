import type { ClassSection, ScheduleSlot, SchoolYear } from "./types";
import { buildCycleDayMap } from "./cycle";

type TimeSchoolYear = Pick<SchoolYear, "startDate" | "endDate" | "blockedDates" | "cycleLength">;

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
}

function slotDurationMinutes(slot: Pick<ScheduleSlot, "startTime" | "endTime">): number {
  const [startHour, startMinute] = slot.startTime.split(":").map(Number);
  const [endHour, endMinute] = slot.endTime.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

/** How many dates within [rangeStart, rangeEnd] land on the given cycle
 * day — a regular (year-long) slot passes the school year's own start/end
 * as the range; a temporary/burst slot (see ScheduleSlot.startDate/endDate)
 * passes its own narrower window, so it only counts the occurrences it
 * actually claims. */
function countCycleDayOccurrencesInRange(
  cycleDayMap: Map<string, number>,
  cycleDay: number,
  rangeStart: string,
  rangeEnd: string,
): number {
  let count = 0;

  for (const [date, day] of cycleDayMap) {
    if (day === cycleDay && date >= rangeStart && date <= rangeEnd) {
      count += 1;
    }
  }

  return count;
}

/**
 * Total scheduled instructional minutes for one class across the school
 * year, based on its actual schedule_slots (not just cycleDays membership,
 * which only says which days a class meets, not for how long) — each
 * slot's own duration times how many times that cycle day actually occurs
 * within the slot's own window (the whole school year for a regular slot,
 * or just its date range for a temporary/burst slot).
 */
export function computeScheduledMinutesForClass(
  schoolYear: TimeSchoolYear,
  classId: string,
  scheduleSlots: Pick<
    ScheduleSlot,
    "classId" | "cycleDay" | "startTime" | "endTime" | "startDate" | "endDate"
  >[],
): number {
  const cycleDayMap = buildCycleDayMap(schoolYear);

  return scheduleSlots
    .filter((slot) => slot.classId === classId)
    .reduce((total, slot) => {
      const occurrenceCount = countCycleDayOccurrencesInRange(
        cycleDayMap,
        slot.cycleDay,
        slot.startDate ?? schoolYear.startDate,
        slot.endDate ?? schoolYear.endDate,
      );
      return total + slotDurationMinutes(slot) * occurrenceCount;
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
  scheduleSlots: Pick<ScheduleSlot, "classId" | "cycleDay" | "startTime" | "endTime">[],
): ClassInstructionalTime[] {
  return classes.map((classSection) => {
    const scheduledMinutes = computeScheduledMinutesForClass(
      schoolYear,
      classSection.id,
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
