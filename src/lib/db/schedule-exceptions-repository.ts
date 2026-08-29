import type { ScheduleException } from "@/src/features/planner/types";
import { cascadeRescheduleUnitLessons } from "./planner-repository";
import type { ClassPilotDatabase } from "./sqlite";

type ScheduleExceptionRow = {
  id: string;
  class_id: string;
  date: string;
  label: string;
  substitute_class_id: string | null;
};

function notFound(kind: string, id: string): Error {
  return new Error(`${kind} not found: ${id}`);
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

function exceptionOwnedByUser(db: ClassPilotDatabase, id: string, userId: string): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM schedule_exceptions
       JOIN class_sections ON class_sections.id = schedule_exceptions.class_id
       JOIN school_years ON school_years.id = class_sections.school_year_id
       WHERE schedule_exceptions.id = ? AND school_years.user_id = ?`,
    )
    .get(id, userId);
}

function defaultExceptionLabel(db: ClassPilotDatabase, substituteClassId: string | undefined): string {
  if (!substituteClassId) {
    return "Assembly";
  }

  const row = db
    .prepare("SELECT name FROM class_sections WHERE id = ?")
    .get(substituteClassId) as { name: string } | undefined;

  return row?.name ?? "Assembly";
}

function mapScheduleException(row: ScheduleExceptionRow): ScheduleException {
  return {
    classId: row.class_id,
    date: row.date,
    id: row.id,
    label: row.label,
    substituteClassId: row.substitute_class_id ?? undefined,
  };
}

export function getScheduleExceptions(
  db: ClassPilotDatabase,
  userId: string,
  schoolYearId: string,
): ScheduleException[] {
  const rows = db
    .prepare(
      `SELECT schedule_exceptions.id, schedule_exceptions.class_id,
              schedule_exceptions.date, schedule_exceptions.label,
              schedule_exceptions.substitute_class_id
       FROM schedule_exceptions
       JOIN class_sections ON class_sections.id = schedule_exceptions.class_id
       JOIN school_years ON school_years.id = class_sections.school_year_id
       WHERE class_sections.school_year_id = ? AND school_years.user_id = ?
       ORDER BY schedule_exceptions.date`,
    )
    .all(schoolYearId, userId) as ScheduleExceptionRow[];

  return rows.map(mapScheduleException);
}

export type CreateScheduleExceptionInput = {
  classId: string;
  date: string;
  /** Blank means "default it" -- to the substitute class's name when
   * substituteClassId is set, else "Assembly". */
  label: string;
  substituteClassId?: string;
};

export type CreateScheduleExceptionResult = {
  exceptionId: string;
  shiftedLessonCount: number;
};

/**
 * Marks classId's meeting on date as replaced by a non-academic event, or
 * by substituteClassId's lesson if given. If a lesson is already dated
 * exactly `date` in the unit covering that date for this class, cascade-
 * shifts it (and everything after it) forward one meeting day -- same
 * cascadeRescheduleUnitLessons primitive addTemporaryScheduleSlot uses for
 * its own "this displaces a lesson" case. That cascade call manages its own
 * transaction (node:sqlite doesn't support nested transactions), so this
 * can't be wrapped in one outer BEGIN/COMMIT the way a single-table write
 * normally would be.
 */
export function createScheduleException(
  db: ClassPilotDatabase,
  userId: string,
  input: CreateScheduleExceptionInput,
): CreateScheduleExceptionResult {
  if (!classOwnedByUser(db, input.classId, userId)) {
    throw notFound("Class", input.classId);
  }

  if (input.substituteClassId && !classOwnedByUser(db, input.substituteClassId, userId)) {
    throw notFound("Class", input.substituteClassId);
  }

  const label = input.label.trim() || defaultExceptionLabel(db, input.substituteClassId);

  const existing = db
    .prepare("SELECT id FROM schedule_exceptions WHERE class_id = ? AND date = ?")
    .get(input.classId, input.date) as { id: string } | undefined;
  const id = existing?.id ?? `exception-${crypto.randomUUID()}`;

  db.prepare(
    `INSERT INTO schedule_exceptions (id, class_id, date, label, substitute_class_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(class_id, date) DO UPDATE SET label = excluded.label, substitute_class_id = excluded.substitute_class_id`,
  ).run(
    id,
    input.classId,
    input.date,
    label,
    input.substituteClassId ?? null,
    new Date().toISOString(),
  );

  const displacedUnit = db
    .prepare(
      `SELECT unit_plans.id AS unit_id
       FROM unit_plans
       WHERE unit_plans.class_id = ? AND ? BETWEEN unit_plans.start_date AND unit_plans.end_date`,
    )
    .get(input.classId, input.date) as { unit_id: string } | undefined;

  if (!displacedUnit) {
    return { exceptionId: id, shiftedLessonCount: 0 };
  }

  const displacedLesson = db
    .prepare("SELECT id FROM lesson_plans WHERE unit_id = ? AND date = ?")
    .get(displacedUnit.unit_id, input.date) as { id: string } | undefined;

  if (!displacedLesson) {
    return { exceptionId: id, shiftedLessonCount: 0 };
  }

  const result = cascadeRescheduleUnitLessons(db, userId, {
    fromDate: input.date,
    shiftByDays: 1,
    unitId: displacedUnit.unit_id,
  });

  return { exceptionId: id, shiftedLessonCount: result.shiftedLessonIds.length };
}

/** "Restore the class." Doesn't auto-unshift any lesson that createScheduleException
 * bumped -- nothing in this codebase auto-reverses a cascade (same as
 * removing a NonInstructionalDay). */
export function deleteScheduleException(db: ClassPilotDatabase, userId: string, id: string): void {
  if (!exceptionOwnedByUser(db, id, userId)) {
    throw notFound("Schedule exception", id);
  }

  db.prepare("DELETE FROM schedule_exceptions WHERE id = ?").run(id);
}
