import { getClassMeetingDates } from "./cycle";
import type { ClassSection, SchoolYear, UnitPlan } from "./types";

type PacingSchoolYear = Pick<SchoolYear, "startDate" | "endDate" | "blockedDates" | "cycleLength">;
type PacingClassSection = Pick<ClassSection, "cycleDays">;
type PacingUnit = Pick<UnitPlan, "startDate" | "endDate" | "lessons">;

export type UnitPacing = {
  scheduledLessons: number;
  /** How many of the class's actual meeting days fall within the unit's
   * date range — the ceiling on how many lessons can realistically be
   * taught without extending the unit or doubling up in a day. */
  availableMeetingDays: number;
  /** True when more lessons are planned than there are meeting days to
   * teach them in. */
  isOverloaded: boolean;
};

/**
 * Checks a unit's lesson count against its class's real meeting days within
 * the unit's date range — the core "pacing" question: can this unit
 * actually be taught in the time it's been given?
 */
export function computeUnitPacing(
  unit: PacingUnit,
  classSection: PacingClassSection,
  schoolYear: PacingSchoolYear,
): UnitPacing {
  const meetingDates = getClassMeetingDates(schoolYear, classSection);
  const availableMeetingDays = meetingDates.filter(
    (date) => date >= unit.startDate && date <= unit.endDate,
  ).length;
  const scheduledLessons = unit.lessons.length;

  return {
    availableMeetingDays,
    isOverloaded: scheduledLessons > availableMeetingDays,
    scheduledLessons,
  };
}

/**
 * IDs of every unit whose date range overlaps another unit on the same
 * class — two units both claiming the same class's time is very likely a
 * planning mistake (a teacher can still choose to leave it, e.g. a short
 * enrichment unit running alongside a longer one).
 */
export function findOverlappingUnitIds(
  units: Array<Pick<UnitPlan, "id" | "classId" | "startDate" | "endDate">>,
): Set<string> {
  const overlapping = new Set<string>();

  for (let i = 0; i < units.length; i += 1) {
    for (let j = i + 1; j < units.length; j += 1) {
      const a = units[i];
      const b = units[j];

      if (a.classId !== b.classId) continue;
      if (a.startDate <= b.endDate && b.startDate <= a.endDate) {
        overlapping.add(a.id);
        overlapping.add(b.id);
      }
    }
  }

  return overlapping;
}
