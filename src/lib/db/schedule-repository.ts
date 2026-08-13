import { buildCycleDayMap } from "@/src/features/planner/cycle";
import type { ScheduleSlot } from "@/src/features/planner/types";
import { cascadeRescheduleUnitLessons, getSchoolYearById } from "./planner-repository";
import type { ClassPilotDatabase } from "./sqlite";

type ScheduleSlotRow = {
  id: string;
  class_id: string;
  cycle_day: number;
  start_time: string;
  end_time: string;
  start_date: string | null;
  end_date: string | null;
};

function notFound(kind: string, id: string): Error {
  return new Error(`${kind} not found: ${id}`);
}

function schoolYearOwnedByUser(
  db: ClassPilotDatabase,
  schoolYearId: string,
  userId: string,
): boolean {
  return !!db
    .prepare("SELECT 1 FROM school_years WHERE id = ? AND user_id = ?")
    .get(schoolYearId, userId);
}

function classOwnedByUser(db: ClassPilotDatabase, classId: string, userId: string): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM class_sections
       JOIN school_years ON school_years.id = class_sections.school_year_id
       WHERE class_sections.id = ? AND school_years.user_id = ?`,
    )
    .get(classId, userId);
}

function slotOwnedByUser(db: ClassPilotDatabase, slotId: string, userId: string): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM schedule_slots
       JOIN class_sections ON class_sections.id = schedule_slots.class_id
       JOIN school_years ON school_years.id = class_sections.school_year_id
       WHERE schedule_slots.id = ? AND school_years.user_id = ?`,
    )
    .get(slotId, userId);
}

export function getScheduleSlots(
  db: ClassPilotDatabase,
  userId: string,
  schoolYearId: string,
): ScheduleSlot[] {
  if (!schoolYearOwnedByUser(db, schoolYearId, userId)) {
    return [];
  }

  const rows = db
    .prepare(
      `SELECT schedule_slots.id, schedule_slots.class_id, schedule_slots.cycle_day,
              schedule_slots.start_time, schedule_slots.end_time,
              schedule_slots.start_date, schedule_slots.end_date
       FROM schedule_slots
       JOIN class_sections ON class_sections.id = schedule_slots.class_id
       WHERE class_sections.school_year_id = ?
       ORDER BY schedule_slots.cycle_day, schedule_slots.start_time`,
    )
    .all(schoolYearId) as ScheduleSlotRow[];

  return rows.map(mapScheduleSlot);
}

export function getScheduleSlotsForClass(
  db: ClassPilotDatabase,
  userId: string,
  classId: string,
): ScheduleSlot[] {
  if (!classOwnedByUser(db, classId, userId)) {
    return [];
  }

  const rows = db
    .prepare(
      `SELECT id, class_id, cycle_day, start_time, end_time, start_date, end_date
       FROM schedule_slots WHERE class_id = ? ORDER BY cycle_day`,
    )
    .all(classId) as ScheduleSlotRow[];

  return rows.map(mapScheduleSlot);
}

export type ClassScheduleSlotInput = {
  cycleDay: number;
  startTime: string;
  endTime: string;
};

export type ScheduleConflict = {
  cycleDay: number;
  className: string;
};

function timeRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Replaces a class's entire schedule in one atomic step — the whole point
 * of the "click a class, check off days and times" editing model, versus
 * assigning one slot at a time. Also sets the class's `cycleDays` to
 * exactly the days being scheduled, so cascade rescheduling and "extend to
 * next day" pick up the right meeting days. Returns any conflicts against
 * other classes' slots on the same cycle day with an overlapping time
 * range — surfaced as a warning, not blocked (a teacher may have a
 * legitimate reason, e.g. team teaching). Conflicts are only checked
 * against the requesting user's own other classes (a JOIN back to
 * school_years.user_id), never another user's schedule.
 */
export function setClassSchedule(
  db: ClassPilotDatabase,
  userId: string,
  classId: string,
  slots: ClassScheduleSlotInput[],
): ScheduleConflict[] {
  if (!classOwnedByUser(db, classId, userId)) {
    throw notFound("Class", classId);
  }

  const conflicts: ScheduleConflict[] = [];

  db.exec("BEGIN;");
  try {
    // Only the class's regular (non-dated) slots — temporary/burst slots
    // added via addTemporaryScheduleSlot are untouched by editing the
    // regular schedule.
    db.prepare("DELETE FROM schedule_slots WHERE class_id = ? AND start_date IS NULL").run(
      classId,
    );

    for (const slot of slots) {
      const id = `slot-${crypto.randomUUID()}`;
      db.prepare(
        "INSERT INTO schedule_slots (id, class_id, cycle_day, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
      ).run(id, classId, slot.cycleDay, slot.startTime, slot.endTime);
    }

    const cycleDays = Array.from(new Set(slots.map((slot) => slot.cycleDay))).sort(
      (a, b) => a - b,
    );
    db.prepare("UPDATE class_sections SET cycle_days_json = ? WHERE id = ?").run(
      JSON.stringify(cycleDays),
      classId,
    );

    const otherSlots = db
      .prepare(
        `SELECT schedule_slots.cycle_day, schedule_slots.start_time, schedule_slots.end_time, class_sections.name
         FROM schedule_slots
         JOIN class_sections ON class_sections.id = schedule_slots.class_id
         JOIN school_years ON school_years.id = class_sections.school_year_id
         WHERE schedule_slots.class_id != ? AND school_years.user_id = ?`,
      )
      .all(classId, userId) as Array<{
      cycle_day: number;
      start_time: string;
      end_time: string;
      name: string;
    }>;

    for (const slot of slots) {
      for (const other of otherSlots) {
        if (
          other.cycle_day === slot.cycleDay &&
          timeRangesOverlap(slot.startTime, slot.endTime, other.start_time, other.end_time)
        ) {
          conflicts.push({ cycleDay: slot.cycleDay, className: other.name });
        }
      }
    }

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return conflicts;
}

function mapScheduleSlot(row: ScheduleSlotRow): ScheduleSlot {
  return {
    id: row.id,
    classId: row.class_id,
    cycleDay: row.cycle_day,
    startTime: row.start_time,
    endTime: row.end_time,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
  };
}

export type TemporaryScheduleSlotInput = {
  cycleDay: number;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
};

export type ScheduleSwapNotice = {
  displacedClassId: string;
  displacedClassName: string;
  /** How many of the displaced class's own meeting-day occurrences of this
   * cycleDay/time fall inside the new slot's date range. */
  displacedOccurrences: number;
  /** Lessons that were pushed forward to make room, one entry per unit
   * touched (a class can have more than one unit active in the window). */
  shiftedUnits: Array<{ unitId: string; unitTitle: string; shiftedLessonCount: number }>;
};

/**
 * Adds a one-off, date-ranged slot alongside a class's regular schedule
 * (unlike setClassSchedule, this never deletes existing slots — it's purely
 * additive) — for a class taught in a burst rather than at a steady cycle
 * interval (e.g. daily for two weeks instead of every 6th day all year).
 *
 * If the slot overlaps another class's regular (non-dated) slot on the same
 * cycleDay/time, that's treated as an intentional swap, not a blocking
 * conflict: every lesson the displaced class already had planned on a date
 * inside the new slot's range is cascade-shifted forward by the number of
 * occurrences taken — reusing the same "push everything after this point
 * forward" logic as a snow day, which naturally extends the affected
 * unit's timeline instead of leaving orphaned/overlapping lessons. Returns
 * one notice per displaced class so the caller can surface what happened.
 * Displacement is only checked against the requesting user's own other
 * classes, same as setClassSchedule.
 */
export function addTemporaryScheduleSlot(
  db: ClassPilotDatabase,
  userId: string,
  classId: string,
  input: TemporaryScheduleSlotInput,
): ScheduleSwapNotice[] {
  if (!classOwnedByUser(db, classId, userId)) {
    throw notFound("Class", classId);
  }

  const classSection = db
    .prepare("SELECT school_year_id FROM class_sections WHERE id = ?")
    .get(classId) as { school_year_id: string } | undefined;

  if (!classSection) {
    throw notFound("Class", classId);
  }

  const schoolYear = getSchoolYearById(db, userId, classSection.school_year_id);
  const cycleDayMap = buildCycleDayMap(schoolYear);
  const displacedOccurrences = Array.from(cycleDayMap.entries()).filter(
    ([date, cycleDay]) =>
      cycleDay === input.cycleDay && date >= input.startDate && date <= input.endDate,
  ).length;

  const sameCycleDaySlots = db
    .prepare(
      `SELECT DISTINCT class_sections.id AS class_id, class_sections.name,
              schedule_slots.start_time, schedule_slots.end_time
       FROM schedule_slots
       JOIN class_sections ON class_sections.id = schedule_slots.class_id
       JOIN school_years ON school_years.id = class_sections.school_year_id
       WHERE schedule_slots.class_id != ?
         AND schedule_slots.cycle_day = ?
         AND schedule_slots.start_date IS NULL
         AND school_years.user_id = ?`,
    )
    .all(classId, input.cycleDay, userId) as Array<{
    class_id: string;
    name: string;
    start_time: string;
    end_time: string;
  }>;

  const displacedClasses = new Map(
    sameCycleDaySlots
      .filter((slot) => timeRangesOverlap(input.startTime, input.endTime, slot.start_time, slot.end_time))
      .map((slot) => [slot.class_id, slot.name]),
  );
  const otherRegularSlots = Array.from(displacedClasses.entries()).map(([classId, name]) => ({
    class_id: classId,
    name,
  }));

  const notices: ScheduleSwapNotice[] = [];

  // Single-statement insert is already atomic; the cascade calls below
  // each manage their own transaction internally (cascadeRescheduleUnitLessons),
  // and node:sqlite doesn't support nested transactions, so this can't be
  // wrapped in one outer BEGIN/COMMIT the way setClassSchedule is.
  const id = `slot-${crypto.randomUUID()}`;
  db.prepare(
    `INSERT INTO schedule_slots (id, class_id, cycle_day, start_time, end_time, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, classId, input.cycleDay, input.startTime, input.endTime, input.startDate, input.endDate);

  // Unlike setClassSchedule (which replaces cycleDays outright, since it
  // owns the class's whole regular schedule), a temporary slot is additive
  // — union its cycleDay into whatever the class already has instead of
  // overwriting. Without this, a class scheduled *only* via temporary
  // slots (the correct tool for a mid-year-start class, or a class that
  // alternates by month with no permanent slot at all) keeps cycleDays
  // empty, which getClassMeetingDates() reads as "meets every
  // instructional day" — silently wrong for cascade reschedule and
  // "extend to next day", which then place lessons on days the class
  // never actually meets.
  const currentCycleDays = db
    .prepare("SELECT cycle_days_json FROM class_sections WHERE id = ?")
    .get(classId) as { cycle_days_json: string };
  const existingDays = JSON.parse(currentCycleDays.cycle_days_json) as number[];
  const unionedDays =
    existingDays.length === 0
      ? [input.cycleDay]
      : Array.from(new Set([...existingDays, input.cycleDay])).sort((a, b) => a - b);
  db.prepare("UPDATE class_sections SET cycle_days_json = ? WHERE id = ?").run(
    JSON.stringify(unionedDays),
    classId,
  );

  if (displacedOccurrences > 0) {
    for (const other of otherRegularSlots) {
      const affectedUnits = db
        .prepare(
          `SELECT DISTINCT unit_plans.id, unit_plans.title
           FROM lesson_plans
           JOIN unit_plans ON unit_plans.id = lesson_plans.unit_id
           WHERE unit_plans.class_id = ?
             AND lesson_plans.date >= ? AND lesson_plans.date <= ?`,
        )
        .all(other.class_id, input.startDate, input.endDate) as Array<{
        id: string;
        title: string;
      }>;

      const shiftedUnits = affectedUnits.map((unit) => {
        const result = cascadeRescheduleUnitLessons(db, userId, {
          unitId: unit.id,
          fromDate: input.startDate,
          shiftByDays: displacedOccurrences,
        });
        return {
          unitId: unit.id,
          unitTitle: unit.title,
          shiftedLessonCount: result.shiftedLessonIds.length,
        };
      });

      notices.push({
        displacedClassId: other.class_id,
        displacedClassName: other.name,
        displacedOccurrences,
        shiftedUnits,
      });
    }
  }

  return notices;
}

export function deleteScheduleSlot(db: ClassPilotDatabase, userId: string, slotId: string): void {
  if (!slotOwnedByUser(db, slotId, userId)) {
    throw notFound("Schedule slot", slotId);
  }

  db.prepare("DELETE FROM schedule_slots WHERE id = ?").run(slotId);
}
