import { getCycleDayForDate } from "./cycle";
import type { EnrichedLesson } from "./lesson-queries";
import type { ClassSection, ScheduleException, ScheduleSlot, SchoolYear, UnitPlan } from "./types";

export type AgendaEntry = {
  slot: ScheduleSlot;
  classSection: ClassSection;
  lesson?: EnrichedLesson;
  /** The unit whose date range covers this entry's date, for this class --
   * lets an empty slot's "Add lesson" link open the insert-lesson picker
   * already scoped to the right unit. Undefined when no unit's range
   * covers this date (e.g. a gap between units). */
  activeUnitId?: string;
  /** Set when this class's meeting on this date was cancelled and replaced
   * by a non-academic event (assembly, fire drill, ...) -- the entry stays
   * in the agenda (its slot time still shows) but the Plan Book shows the
   * exception's label instead of a lesson/"Add lesson" invite. */
  exception?: ScheduleException;
  /** When exception.substituteClassId is set, that class's own record --
   * lets the Plan Book show whose lesson is filling this slot instead. */
  substituteClassSection?: ClassSection;
  /** The substitute class's lesson already dated on this date, if the
   * teacher has inserted one -- same lookup as `lesson`, just keyed by the
   * substitute class instead of the slot's own class. */
  substituteLesson?: EnrichedLesson;
  /** The substitute class's active unit for this date, for the "Insert
   * lesson" link when no substituteLesson exists yet -- same lookup as
   * activeUnitId, just for the substitute class. */
  substituteActiveUnitId?: string;
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
  units: UnitPlan[] = [],
  scheduleExceptions: ScheduleException[] = [],
): AgendaEntry[] {
  const cycleDay = getCycleDayForDate(schoolYear, date);

  if (cycleDay === undefined) {
    return [];
  }

  const classById = new Map(classes.map((classSection) => [classSection.id, classSection]));
  const lessonByClassId = new Map(lessonsForDate.map((lesson) => [lesson.classId, lesson]));
  const activeUnitIdByClassId = new Map(
    classes.map((classSection) => [
      classSection.id,
      units.find(
        (unit) =>
          unit.classId === classSection.id && date >= unit.startDate && date <= unit.endDate,
      )?.id,
    ]),
  );
  const exceptionByClassId = new Map(
    scheduleExceptions
      .filter((exception) => exception.date === date)
      .map((exception) => [exception.classId, exception]),
  );

  return scheduleSlots
    .filter(
      (slot) =>
        slot.cycleDay === cycleDay &&
        (!slot.startDate || date >= slot.startDate) &&
        (!slot.endDate || date <= slot.endDate),
    )
    .flatMap((slot) => {
      const classSection = classById.get(slot.classId);

      if (!classSection) {
        return [];
      }

      const exception = exceptionByClassId.get(slot.classId);

      return [
        {
          slot,
          classSection,
          lesson: lessonByClassId.get(slot.classId),
          activeUnitId: activeUnitIdByClassId.get(slot.classId),
          exception,
          substituteClassSection: exception?.substituteClassId
            ? classById.get(exception.substituteClassId)
            : undefined,
          substituteLesson: exception?.substituteClassId
            ? lessonByClassId.get(exception.substituteClassId)
            : undefined,
          substituteActiveUnitId: exception?.substituteClassId
            ? activeUnitIdByClassId.get(exception.substituteClassId)
            : undefined,
        },
      ];
    })
    .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
}
