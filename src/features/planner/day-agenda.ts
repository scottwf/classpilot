import { getCycleDayForDate } from "./cycle";
import type { EnrichedLesson } from "./lesson-queries";
import type { ClassSection, ScheduleSlot, SchoolYear } from "./types";

export type AgendaEntry = {
  slot: ScheduleSlot;
  classSection: ClassSection;
  lesson?: EnrichedLesson;
};

type AgendaSchoolYear = Pick<SchoolYear, "startDate" | "endDate" | "blockedDates" | "cycleLength">;

/**
 * One date's real timetable: every class scheduled on that date's cycle
 * day, in time order, each paired with its lesson for that date if one
 * already exists (Plan Book renders an "Add lesson" action instead when
 * there isn't one — see PlanBookPage.tsx). Returns [] for a date with no
 * cycle day (out of the school year's term, or a non-instructional day).
 */
export function buildDayAgenda(
  date: string,
  schoolYear: AgendaSchoolYear,
  scheduleSlots: ScheduleSlot[],
  classes: ClassSection[],
  lessonsForDate: EnrichedLesson[],
): AgendaEntry[] {
  const cycleDay = getCycleDayForDate(schoolYear, date);

  if (cycleDay === undefined) {
    return [];
  }

  const classById = new Map(classes.map((classSection) => [classSection.id, classSection]));
  const lessonByClassId = new Map(lessonsForDate.map((lesson) => [lesson.classId, lesson]));

  return scheduleSlots
    .filter(
      (slot) =>
        slot.cycleDay === cycleDay &&
        (!slot.startDate || date >= slot.startDate) &&
        (!slot.endDate || date <= slot.endDate),
    )
    .flatMap((slot) => {
      const classSection = classById.get(slot.classId);
      return classSection ? [{ slot, classSection, lesson: lessonByClassId.get(slot.classId) }] : [];
    })
    .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
}
