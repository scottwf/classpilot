import type {
  ClassSection,
  CurriculumOutcome,
  DayLabelScheme,
  LessonSections,
  LessonPlan,
  NonInstructionalDay,
  PlannerData,
  SchoolYear,
  UnitPlan,
} from "@/src/features/planner/types";
import { getClassMeetingDates, getNextClassMeetingDate } from "@/src/features/planner/cycle";
import { assignSequentialMeetingDates, computeCascadeShift } from "@/src/features/planner/reschedule";
import type { ClassPilotDatabase } from "./sqlite";

// The id of the first ever school year (seeded on a fresh install). Not a
// magic "active year" pointer anymore — that's users.active_school_year_id,
// resolved via getActiveSchoolYearId(). Kept only as the seed target id.
const seedSchoolYearId = "current";

type SchoolYearRow = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  blocked_dates_json: string;
  cycle_length_days: number;
  day_label_scheme: SchoolYear["dayLabelScheme"];
};

type ClassSectionRow = {
  id: string;
  school_year_id: string;
  name: string;
  subject: string;
  grade: string;
  room: string;
  meeting_pattern: string;
  cycle_days_json: string;
  target_minutes_per_year: number | null;
  color: ClassSection["color"];
  is_instructional: number;
  combined_grades_json: string;
};

type CurriculumOutcomeRow = {
  id: string;
  code: string;
  description: string;
  subject: string;
  grade: string;
  strand: string;
};

type UnitPlanRow = {
  id: string;
  class_id: string;
  title: string;
  start_date: string;
  end_date: string;
  // Column stays for now (NOT NULL, avoids a migration) but is never read
  // -- unit color is always derived from the parent class's color, see
  // src/features/planner/unit-color.ts (issue #27).
  color: string;
  outcome_ids_json: string;
  notes: string;
};

type LessonPlanRow = {
  id: string;
  unit_id: string;
  title: string;
  date: string | null;
  sequence: number;
  duration_minutes: number;
  status: LessonPlan["status"];
  outcome_ids_json: string;
  sections_json: string;
  summary: string;
  continues_from_lesson_id: string | null;
};

export type CreateLessonInput = {
  /** null (or omitted) creates an unscheduled lesson -- issue #39. */
  date?: string | null;
  durationMinutes: number;
  outcomeIds: string[];
  sections?: LessonSections;
  status: LessonPlan["status"];
  summary: string;
  title: string;
  unitId: string;
  continuesFromLessonId?: string;
};

export type EditableLesson = LessonPlan & {
  unitId: string;
};

export type UpdateLessonInput = CreateLessonInput & {
  id: string;
};

export type CreateUnitInput = {
  classId: string;
  endDate: string;
  outcomeIds: string[];
  startDate: string;
  title: string;
  notes?: string;
};

export type EditableUnit = UnitPlan;

export type UpdateUnitInput = CreateUnitInput & {
  id: string;
};

export type CreateClassInput = {
  schoolYearId: string;
  name: string;
  subject: string;
  grade: string;
  room: string;
  meetingPattern: string;
  cycleDays: number[];
  targetMinutesPerYear?: number;
  color?: ClassSection["color"];
  isInstructional?: boolean;
  combinedGrades?: string[];
};

export type UpdateClassInput = CreateClassInput & {
  id: string;
};

function notFound(kind: string, id: string): Error {
  // Deliberately the same message shape whether the row doesn't exist at
  // all or exists but belongs to a different user — never leak which (see
  // issue #21 security checklist: every path returns not-found, never the
  // data, for a resource the caller doesn't own).
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

function unitOwnedByUser(db: ClassPilotDatabase, unitId: string, userId: string): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM unit_plans
       JOIN class_sections ON class_sections.id = unit_plans.class_id
       JOIN school_years ON school_years.id = class_sections.school_year_id
       WHERE unit_plans.id = ? AND school_years.user_id = ?`,
    )
    .get(unitId, userId);
}

function lessonOwnedByUser(db: ClassPilotDatabase, lessonId: string, userId: string): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM lesson_plans
       JOIN unit_plans ON unit_plans.id = lesson_plans.unit_id
       JOIN class_sections ON class_sections.id = unit_plans.class_id
       JOIN school_years ON school_years.id = class_sections.school_year_id
       WHERE lesson_plans.id = ? AND school_years.user_id = ?`,
    )
    .get(lessonId, userId);
}

export function isPlannerSeeded(db: ClassPilotDatabase): boolean {
  const row = db
    .prepare("SELECT 1 FROM school_years WHERE id = ? LIMIT 1")
    .get(seedSchoolYearId) as { 1: number } | undefined;

  return row !== undefined;
}

/**
 * Whether any curriculum outcomes exist yet — used alongside
 * isPlannerSeeded() to tell a genuinely fresh install (neither exists yet,
 * seed the full demo fixture) apart from a post-resetPlannerData() state
 * (outcomes deliberately preserved, everything else deliberately cleared —
 * don't bring the demo fixture back). Global, not user-scoped — see
 * app_settings/curriculum_outcomes decision in issue #21.
 */
export function hasCurriculumOutcomes(db: ClassPilotDatabase): boolean {
  const row = db.prepare("SELECT 1 FROM curriculum_outcomes LIMIT 1").get() as
    | { 1: number }
    | undefined;

  return row !== undefined;
}

/**
 * Clears every school-year-scoped table *for this user only* (their school
 * years, classes, schedules, units, lessons, students and their
 * contacts/notes/support plans/reminders) while leaving curriculum_outcomes
 * and app_settings untouched — "wipe the planner data but keep the
 * curriculum and AI config" for testing a fresh install without losing
 * outcomes that may have taken real effort to import, and without touching
 * any other user's data.
 *
 * Immediately creates and activates a blank placeholder year rather than
 * leaving zero school years — every page (including Settings/onboarding
 * themselves) currently assumes an active school year always exists, so
 * leaving that state empty would make the app unusable until a new one
 * were created through some other path. Use "Start a new school year" on
 * the Settings page afterward to replace the placeholder with real dates.
 */
export function resetPlannerData(db: ClassPilotDatabase, userId: string): void {
  db.exec("BEGIN;");
  try {
    // users.active_school_year_id references school_years with no ON
    // DELETE behavior -- clear it first or the DELETE below hits a FK
    // constraint violation on whichever year is currently active.
    db.prepare("UPDATE users SET active_school_year_id = NULL WHERE id = ?").run(userId);
    // app_state is the pre-multi-user active-year pointer and is no longer
    // read after the one-time user backfill. Its foreign key can otherwise
    // keep an old school year from being removed.
    db.exec("DELETE FROM app_state;");
    db.prepare("DELETE FROM school_years WHERE user_id = ?").run(userId);

    const placeholderYearId = `year-${crypto.randomUUID()}`;
    db.prepare(
      `INSERT INTO school_years (id, user_id, title, start_date, end_date, blocked_dates_json, cycle_length_days, day_label_scheme)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      placeholderYearId,
      userId,
      "New School Year",
      "2026-09-01",
      "2027-06-30",
      "[]",
      1,
      "numeric",
    );
    db.prepare("UPDATE users SET active_school_year_id = ? WHERE id = ?").run(
      placeholderYearId,
      userId,
    );

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export function seedPlannerData(
  db: ClassPilotDatabase,
  userId: string,
  plannerData: PlannerData,
) {
  const insertSchoolYear = db.prepare(`
    INSERT INTO school_years (id, user_id, title, start_date, end_date, blocked_dates_json, cycle_length_days, day_label_scheme)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      title = excluded.title,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      blocked_dates_json = excluded.blocked_dates_json,
      cycle_length_days = excluded.cycle_length_days,
      day_label_scheme = excluded.day_label_scheme
  `);

  const insertClass = db.prepare(`
    INSERT INTO class_sections (id, school_year_id, name, subject, grade, room, meeting_pattern, cycle_days_json, target_minutes_per_year, color, is_instructional, combined_grades_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      school_year_id = excluded.school_year_id,
      name = excluded.name,
      subject = excluded.subject,
      grade = excluded.grade,
      room = excluded.room,
      meeting_pattern = excluded.meeting_pattern,
      cycle_days_json = excluded.cycle_days_json,
      target_minutes_per_year = excluded.target_minutes_per_year,
      color = excluded.color,
      is_instructional = excluded.is_instructional,
      combined_grades_json = excluded.combined_grades_json
  `);

  const insertOutcome = db.prepare(`
    INSERT INTO curriculum_outcomes (id, code, description, subject, grade, strand)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      code = excluded.code,
      description = excluded.description,
      subject = excluded.subject,
      grade = excluded.grade,
      strand = excluded.strand
  `);

  const insertUnit = db.prepare(`
    INSERT INTO unit_plans (id, class_id, title, start_date, end_date, color, outcome_ids_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      class_id = excluded.class_id,
      title = excluded.title,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      color = excluded.color,
      outcome_ids_json = excluded.outcome_ids_json
  `);

  const insertLesson = db.prepare(`
    INSERT INTO lesson_plans (id, unit_id, title, date, sequence, duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      unit_id = excluded.unit_id,
      title = excluded.title,
      date = excluded.date,
      sequence = excluded.sequence,
      duration_minutes = excluded.duration_minutes,
      status = excluded.status,
      outcome_ids_json = excluded.outcome_ids_json,
      sections_json = excluded.sections_json,
      summary = excluded.summary,
      continues_from_lesson_id = excluded.continues_from_lesson_id
  `);

  db.exec("BEGIN;");
  try {
    insertSchoolYear.run(
      seedSchoolYearId,
      userId,
      plannerData.schoolYear.title,
      plannerData.schoolYear.startDate,
      plannerData.schoolYear.endDate,
      JSON.stringify(plannerData.schoolYear.blockedDates),
      plannerData.schoolYear.cycleLength,
      plannerData.schoolYear.dayLabelScheme ?? "numeric",
    );
    db.prepare(
      "UPDATE users SET active_school_year_id = ? WHERE id = ? AND active_school_year_id IS NULL",
    ).run(seedSchoolYearId, userId);

    for (const classSection of plannerData.classes) {
      insertClass.run(
        classSection.id,
        classSection.schoolYearId || seedSchoolYearId,
        classSection.name,
        classSection.subject,
        classSection.grade,
        classSection.room,
        classSection.meetingPattern,
        JSON.stringify(classSection.cycleDays),
        classSection.targetMinutesPerYear ?? null,
        classSection.color ?? "blue",
        classSection.isInstructional === false ? 0 : 1,
        JSON.stringify(classSection.combinedGrades ?? []),
      );
    }

    for (const outcome of plannerData.outcomes) {
      insertOutcome.run(
        outcome.id,
        outcome.code,
        outcome.description,
        outcome.subject,
        outcome.grade,
        outcome.strand,
      );
    }

    for (const unit of plannerData.units) {
      insertUnit.run(
        unit.id,
        unit.classId,
        unit.title,
        unit.startDate,
        unit.endDate,
        // Column stays NOT NULL but is never read -- see UnitPlanRow.
        "blue",
        JSON.stringify(unit.outcomeIds),
      );

      unit.lessons.forEach((lesson, index) => {
        insertLesson.run(
          lesson.id,
          unit.id,
          lesson.title,
          lesson.date,
          index + 1,
          lesson.durationMinutes,
          lesson.status,
          JSON.stringify(lesson.outcomeIds),
          JSON.stringify(normalizeLessonSections(lesson.sections, lesson.summary)),
          lesson.summary,
          lesson.continuesFromLessonId ?? null,
        );
      });
    }

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

/** Which school_years row is shown by default across the app (plan book,
 * unit timeline, classes, schedule, ...) for this user. */
export function getActiveSchoolYearId(db: ClassPilotDatabase, userId: string): string {
  const row = db
    .prepare("SELECT active_school_year_id FROM users WHERE id = ?")
    .get(userId) as { active_school_year_id: string | null } | undefined;

  if (!row?.active_school_year_id) {
    throw new Error("No active school year is set.");
  }

  return row.active_school_year_id;
}

export function setActiveSchoolYear(db: ClassPilotDatabase, userId: string, id: string): void {
  if (!schoolYearOwnedByUser(db, id, userId)) {
    throw notFound("School year", id);
  }

  db.prepare("UPDATE users SET active_school_year_id = ? WHERE id = ?").run(id, userId);
}

export function listSchoolYears(db: ClassPilotDatabase, userId: string): SchoolYear[] {
  const rows = db
    .prepare(
      "SELECT id, title, start_date, end_date, blocked_dates_json, cycle_length_days, day_label_scheme FROM school_years WHERE user_id = ? ORDER BY start_date DESC, rowid DESC",
    )
    .all(userId) as SchoolYearRow[];

  return rows.map(mapSchoolYear);
}

export type CreateSchoolYearInput = {
  title: string;
  startDate: string;
  endDate: string;
  cycleLength: number;
  dayLabelScheme?: DayLabelScheme;
  blockedDates?: NonInstructionalDay[];
};

export function createSchoolYear(
  db: ClassPilotDatabase,
  userId: string,
  input: CreateSchoolYearInput,
): string {
  const id = `year-${crypto.randomUUID()}`;

  db.prepare(
    `INSERT INTO school_years (id, user_id, title, start_date, end_date, blocked_dates_json, cycle_length_days, day_label_scheme)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    input.title,
    input.startDate,
    input.endDate,
    JSON.stringify(input.blockedDates ?? []),
    input.cycleLength,
    input.dayLabelScheme ?? "numeric",
  );

  return id;
}

/** Deletes a school year and, by cascade, every class (and therefore
 * unit/lesson/schedule slot) scoped to it. Refuses to delete the active
 * year — switch to a different one first (setActiveSchoolYear). */
export function deleteSchoolYear(db: ClassPilotDatabase, userId: string, id: string): void {
  if (!schoolYearOwnedByUser(db, id, userId)) {
    throw notFound("School year", id);
  }

  if (getActiveSchoolYearId(db, userId) === id) {
    throw new Error(
      "Can't delete the active school year. Switch to a different year first.",
    );
  }

  db.exec("BEGIN;");
  try {
    // app_state is a retired, global pointer left only for migrations. The
    // per-user pointer checked above is the source of truth. Remove a stale
    // legacy reference before deleting its school year so its foreign key
    // cannot masquerade as an "active year" error.
    db.prepare("DELETE FROM app_state WHERE active_school_year_id = ?").run(id);
    db.prepare("DELETE FROM school_years WHERE id = ? AND user_id = ?").run(id, userId);
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export function getSchoolYearById(
  db: ClassPilotDatabase,
  userId: string,
  id: string,
): SchoolYear {
  const row = db
    .prepare(
      "SELECT id, title, start_date, end_date, blocked_dates_json, cycle_length_days, day_label_scheme FROM school_years WHERE id = ? AND user_id = ?",
    )
    .get(id, userId) as SchoolYearRow | undefined;

  if (!row) {
    throw notFound("School year", id);
  }

  return mapSchoolYear(row);
}

/** The active school year's full details — see getActiveSchoolYearId(). */
export function getSchoolYear(db: ClassPilotDatabase, userId: string): SchoolYear {
  return getSchoolYearById(db, userId, getActiveSchoolYearId(db, userId));
}

export type UpdateSchoolYearInput = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  blockedDates: NonInstructionalDay[];
  cycleLength: number;
  dayLabelScheme?: DayLabelScheme;
};

export function updateSchoolYear(
  db: ClassPilotDatabase,
  userId: string,
  input: UpdateSchoolYearInput,
) {
  const blockedDates = [...input.blockedDates].sort((left, right) =>
    left.date.localeCompare(right.date),
  );

  const result = db
    .prepare(
      `UPDATE school_years
       SET title = ?, start_date = ?, end_date = ?, blocked_dates_json = ?, cycle_length_days = ?, day_label_scheme = ?
       WHERE id = ? AND user_id = ?`,
    )
    .run(
      input.title,
      input.startDate,
      input.endDate,
      JSON.stringify(blockedDates),
      input.cycleLength,
      input.dayLabelScheme ?? "numeric",
      input.id,
      userId,
    );

  if (result.changes === 0) {
    throw notFound("School year", input.id);
  }
}

/** Next `sequence` value for a new lesson in this unit -- one past
 * whatever's already there, so a fresh lesson always lands at the end of
 * the unit's order (issue #39). Not exported: only createLesson and the
 * other lesson-creating paths in this file need it. */
function nextLessonSequence(db: ClassPilotDatabase, unitId: string): number {
  const row = db
    .prepare("SELECT COALESCE(MAX(sequence), 0) AS maxSequence FROM lesson_plans WHERE unit_id = ?")
    .get(unitId) as { maxSequence: number };

  return row.maxSequence + 1;
}

export function createLesson(
  db: ClassPilotDatabase,
  userId: string,
  input: CreateLessonInput,
): string {
  if (!unitOwnedByUser(db, input.unitId, userId)) {
    throw notFound("Unit", input.unitId);
  }

  const id = `lesson-${crypto.randomUUID()}`;

  db.prepare(`
    INSERT INTO lesson_plans (id, unit_id, title, date, sequence, duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.unitId,
    input.title,
    input.date ?? null,
    nextLessonSequence(db, input.unitId),
    input.durationMinutes,
    input.status,
    JSON.stringify(input.outcomeIds),
    JSON.stringify(normalizeLessonSections(input.sections, input.summary)),
    input.summary,
    input.continuesFromLessonId ?? null,
  );

  return id;
}

export function getLessonById(
  db: ClassPilotDatabase,
  userId: string,
  id: string,
): EditableLesson | undefined {
  if (!lessonOwnedByUser(db, id, userId)) {
    return undefined;
  }

  const row = db
    .prepare(
      "SELECT id, unit_id, title, date, sequence, duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id FROM lesson_plans WHERE id = ?",
    )
    .get(id) as LessonPlanRow | undefined;

  if (!row) {
    return undefined;
  }

  return {
    ...mapLessonPlan(row),
    unitId: row.unit_id,
  };
}

export function updateLesson(
  db: ClassPilotDatabase,
  userId: string,
  input: UpdateLessonInput,
) {
  if (!lessonOwnedByUser(db, input.id, userId) || !unitOwnedByUser(db, input.unitId, userId)) {
    throw notFound("Lesson", input.id);
  }

  const result = db.prepare(`
    UPDATE lesson_plans
    SET
      unit_id = ?,
      title = ?,
      date = ?,
      duration_minutes = ?,
      status = ?,
      outcome_ids_json = ?,
      sections_json = ?,
      summary = ?
    WHERE id = ?
  `).run(
    input.unitId,
    input.title,
    input.date ?? null,
    input.durationMinutes,
    input.status,
    JSON.stringify(input.outcomeIds),
    JSON.stringify(normalizeLessonSections(input.sections, input.summary)),
    input.summary,
    input.id,
  );

  if (result.changes === 0) {
    throw notFound("Lesson", input.id);
  }
}

export function createUnit(
  db: ClassPilotDatabase,
  userId: string,
  input: CreateUnitInput,
): string {
  if (!classOwnedByUser(db, input.classId, userId)) {
    throw notFound("Class", input.classId);
  }

  const id = `unit-${crypto.randomUUID()}`;

  db.prepare(`
    INSERT INTO unit_plans (id, class_id, title, start_date, end_date, color, outcome_ids_json, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.classId,
    input.title,
    input.startDate,
    input.endDate,
    "blue",
    JSON.stringify(input.outcomeIds),
    input.notes ?? "",
  );

  return id;
}

export type CreateUnitWithLessonsInput = {
  unit: CreateUnitInput;
  lessons: Array<Omit<CreateLessonInput, "unitId">>;
};

/**
 * Creates a unit and its lessons atomically. Used by the AI assistant's
 * "save draft as a unit" flow so a partially-written unit can never be left
 * behind if a lesson insert fails.
 */
export function createUnitWithLessons(
  db: ClassPilotDatabase,
  userId: string,
  input: CreateUnitWithLessonsInput,
): string {
  if (!classOwnedByUser(db, input.unit.classId, userId)) {
    throw notFound("Class", input.unit.classId);
  }

  const unitId = `unit-${crypto.randomUUID()}`;

  const insertUnit = db.prepare(`
    INSERT INTO unit_plans (id, class_id, title, start_date, end_date, color, outcome_ids_json, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLesson = db.prepare(`
    INSERT INTO lesson_plans (id, unit_id, title, date, sequence, duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN;");
  try {
    insertUnit.run(
      unitId,
      input.unit.classId,
      input.unit.title,
      input.unit.startDate,
      input.unit.endDate,
      "blue",
      JSON.stringify(input.unit.outcomeIds),
      input.unit.notes ?? "",
    );

    input.lessons.forEach((lesson, index) => {
      insertLesson.run(
        `lesson-${crypto.randomUUID()}`,
        unitId,
        lesson.title,
        lesson.date ?? null,
        index + 1,
        lesson.durationMinutes,
        lesson.status,
        JSON.stringify(lesson.outcomeIds),
        JSON.stringify(normalizeLessonSections(lesson.sections, lesson.summary)),
        lesson.summary,
        null,
      );
    });

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return unitId;
}

export function getUnitById(
  db: ClassPilotDatabase,
  userId: string,
  id: string,
): EditableUnit | undefined {
  if (!unitOwnedByUser(db, id, userId)) {
    return undefined;
  }

  const row = db
    .prepare(
      "SELECT id, class_id, title, start_date, end_date, color, outcome_ids_json, notes FROM unit_plans WHERE id = ?",
    )
    .get(id) as UnitPlanRow | undefined;

  if (!row) {
    return undefined;
  }

  const lessons = db
    .prepare(
      "SELECT id, unit_id, title, date, sequence, duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id FROM lesson_plans WHERE unit_id = ? ORDER BY sequence, rowid",
    )
    .all(id) as LessonPlanRow[];

  return mapUnitPlan(row, lessons);
}

export function updateUnit(
  db: ClassPilotDatabase,
  userId: string,
  input: UpdateUnitInput,
) {
  if (!unitOwnedByUser(db, input.id, userId) || !classOwnedByUser(db, input.classId, userId)) {
    throw notFound("Unit", input.id);
  }

  const result = db.prepare(`
    UPDATE unit_plans
    SET
      class_id = ?,
      title = ?,
      start_date = ?,
      end_date = ?,
      outcome_ids_json = ?,
      notes = ?
    WHERE id = ?
  `).run(
    input.classId,
    input.title,
    input.startDate,
    input.endDate,
    JSON.stringify(input.outcomeIds),
    input.notes ?? "",
    input.id,
  );

  if (result.changes === 0) {
    throw notFound("Unit", input.id);
  }
}

/**
 * Patches only a unit's date range — used by the timeline's drag/resize
 * interaction, which shouldn't require re-submitting title/color/outcomes
 * just to move a unit's dates.
 */
export function updateUnitDates(
  db: ClassPilotDatabase,
  userId: string,
  input: { id: string; startDate: string; endDate: string },
) {
  if (!unitOwnedByUser(db, input.id, userId)) {
    throw notFound("Unit", input.id);
  }

  const result = db
    .prepare("UPDATE unit_plans SET start_date = ?, end_date = ? WHERE id = ?")
    .run(input.startDate, input.endDate, input.id);

  if (result.changes === 0) {
    throw notFound("Unit", input.id);
  }
}

/**
 * Patches only a lesson's date — used to "move" an existing lesson from
 * the bank onto a clicked schedule slot, without touching its title,
 * sections, or outcomes.
 */
export function updateLessonDate(
  db: ClassPilotDatabase,
  userId: string,
  input: { id: string; date: string },
) {
  if (!lessonOwnedByUser(db, input.id, userId)) {
    throw notFound("Lesson", input.id);
  }

  const result = db
    .prepare("UPDATE lesson_plans SET date = ? WHERE id = ?")
    .run(input.date, input.id);

  if (result.changes === 0) {
    throw notFound("Lesson", input.id);
  }
}

export function createClass(
  db: ClassPilotDatabase,
  userId: string,
  input: CreateClassInput,
): string {
  if (!schoolYearOwnedByUser(db, input.schoolYearId, userId)) {
    throw notFound("School year", input.schoolYearId);
  }

  const id = `class-${crypto.randomUUID()}`;

  db.prepare(`
    INSERT INTO class_sections (id, school_year_id, name, subject, grade, room, meeting_pattern, cycle_days_json, target_minutes_per_year, color, is_instructional, combined_grades_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.schoolYearId,
    input.name,
    input.subject,
    input.grade,
    input.room,
    input.meetingPattern,
    JSON.stringify(input.cycleDays),
    input.targetMinutesPerYear ?? null,
    input.color ?? "blue",
    input.isInstructional === false ? 0 : 1,
    JSON.stringify(input.combinedGrades ?? []),
  );

  return id;
}

export function updateClass(db: ClassPilotDatabase, userId: string, input: UpdateClassInput) {
  if (
    !classOwnedByUser(db, input.id, userId) ||
    !schoolYearOwnedByUser(db, input.schoolYearId, userId)
  ) {
    throw notFound("Class", input.id);
  }

  const result = db.prepare(`
    UPDATE class_sections
    SET
      school_year_id = ?,
      name = ?,
      subject = ?,
      grade = ?,
      room = ?,
      meeting_pattern = ?,
      cycle_days_json = ?,
      target_minutes_per_year = ?,
      color = ?,
      is_instructional = ?,
      combined_grades_json = ?
    WHERE id = ?
  `).run(
    input.schoolYearId,
    input.name,
    input.subject,
    input.grade,
    input.room,
    input.meetingPattern,
    JSON.stringify(input.cycleDays),
    input.targetMinutesPerYear ?? null,
    input.color ?? "blue",
    input.isInstructional === false ? 0 : 1,
    JSON.stringify(input.combinedGrades ?? []),
    input.id,
  );

  if (result.changes === 0) {
    throw notFound("Class", input.id);
  }
}

export function getClassById(
  db: ClassPilotDatabase,
  userId: string,
  id: string,
): ClassSection | undefined {
  if (!classOwnedByUser(db, id, userId)) {
    return undefined;
  }

  const row = db
    .prepare(
      "SELECT id, school_year_id, name, subject, grade, room, meeting_pattern, cycle_days_json, target_minutes_per_year, color, is_instructional, combined_grades_json FROM class_sections WHERE id = ?",
    )
    .get(id) as ClassSectionRow | undefined;

  return row ? mapClassSection(row) : undefined;
}

export function listClassesForSchoolYear(
  db: ClassPilotDatabase,
  userId: string,
  schoolYearId: string,
): ClassSection[] {
  if (!schoolYearOwnedByUser(db, schoolYearId, userId)) {
    return [];
  }

  const rows = db
    .prepare(
      "SELECT id, school_year_id, name, subject, grade, room, meeting_pattern, cycle_days_json, target_minutes_per_year, color, is_instructional, combined_grades_json FROM class_sections WHERE school_year_id = ? ORDER BY rowid",
    )
    .all(schoolYearId) as ClassSectionRow[];

  return rows.map(mapClassSection);
}

// Units (and therefore lessons) cascade-delete via the class_sections FK, so
// deleting a class removes its units/lessons too — same as deleting a unit
// removes its lessons.
export function deleteClass(db: ClassPilotDatabase, userId: string, id: string) {
  if (!classOwnedByUser(db, id, userId)) {
    throw notFound("Class", id);
  }

  db.prepare("DELETE FROM class_sections WHERE id = ?").run(id);
}

// Local, minimal query rather than importing getScheduleSlotsForClass from
// schedule-repository.ts — that module already imports from this one
// (cascadeRescheduleUnitLessons, getSchoolYearById), so importing it back
// here would be circular. Ownership of classId is verified by the caller
// (cascadeRescheduleUnitLessons / duplicateLessonAsContinuation) before this
// runs.
function getScheduleSlotRowsForClass(
  db: ClassPilotDatabase,
  classId: string,
): Array<{ cycleDay: number; startDate?: string; endDate?: string }> {
  const rows = db
    .prepare("SELECT cycle_day, start_date, end_date FROM schedule_slots WHERE class_id = ?")
    .all(classId) as Array<{ cycle_day: number; start_date: string | null; end_date: string | null }>;

  return rows.map((row) => ({
    cycleDay: row.cycle_day,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
  }));
}

export type CascadeRescheduleInput = {
  unitId: string;
  fromDate: string;
  shiftByDays: number;
};

export type CascadeRescheduleResult = {
  shiftedLessonIds: string[];
};

/**
 * Shifts every lesson in a unit on/after `fromDate` by `shiftByDays` of the
 * unit's class's actual meeting days (its cycleDays, or every instructional
 * day if the class has no cycle restriction), preserving relative spacing.
 * This is the "move a lesson" / "insert a lesson" cascade: update (or
 * create) the lesson at `fromDate` yourself, then call this to push
 * everything already scheduled on/after it out of the way in one atomic
 * update.
 */
export function cascadeRescheduleUnitLessons(
  db: ClassPilotDatabase,
  userId: string,
  input: CascadeRescheduleInput,
): CascadeRescheduleResult {
  const unit = getUnitById(db, userId, input.unitId);

  if (!unit) {
    throw notFound("Unit", input.unitId);
  }

  const classSection = getClassById(db, userId, unit.classId);

  if (!classSection) {
    throw new Error(`Class not found for unit: ${input.unitId}`);
  }

  const schoolYear = getSchoolYearById(db, userId, classSection.schoolYearId);
  const scheduleSlots = getScheduleSlotRowsForClass(db, classSection.id);
  const meetingDates = getClassMeetingDates(schoolYear, classSection, scheduleSlots);
  const shifts = computeCascadeShift(
    unit.lessons,
    input.fromDate,
    meetingDates,
    input.shiftByDays,
  );

  if (shifts.length === 0) {
    return { shiftedLessonIds: [] };
  }

  const updateLessonDateStmt = db.prepare("UPDATE lesson_plans SET date = ? WHERE id = ?");

  db.exec("BEGIN;");
  try {
    for (const shift of shifts) {
      updateLessonDateStmt.run(shift.date, shift.id);
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return { shiftedLessonIds: shifts.map((shift) => shift.id) };
}

export type AutoScheduleResult = {
  scheduledLessonIds: string[];
};

/**
 * Fills in every undated lesson in a unit onto the class's next available
 * actual meeting days, in sequence order (issue #44) -- the fix for a
 * bulk-imported unit's lessons landing entirely unscheduled, needing to be
 * placed one at a time via the lesson editor's "use an existing lesson"
 * picker. Starts the day after the unit's latest already-dated lesson (if
 * it has one) so newly-scheduled lessons continue the sequence rather than
 * potentially landing before/on top of it; otherwise starts at the unit's
 * own startDate. A no-op (returns an empty result) if the unit has no
 * undated lessons.
 */
export function autoScheduleUnitLessons(
  db: ClassPilotDatabase,
  userId: string,
  unitId: string,
): AutoScheduleResult {
  const unit = getUnitById(db, userId, unitId);

  if (!unit) {
    throw notFound("Unit", unitId);
  }

  const classSection = getClassById(db, userId, unit.classId);

  if (!classSection) {
    throw new Error(`Class not found for unit: ${unitId}`);
  }

  const schoolYear = getSchoolYearById(db, userId, classSection.schoolYearId);
  const scheduleSlots = getScheduleSlotRowsForClass(db, classSection.id);
  const meetingDates = getClassMeetingDates(schoolYear, classSection, scheduleSlots);

  const latestDatedDate = unit.lessons
    .map((lesson) => lesson.date)
    .filter((date): date is string => date !== null)
    .sort()
    .at(-1);
  const fromDate = latestDatedDate
    ? (meetingDates.find((date) => date > latestDatedDate) ?? unit.startDate)
    : unit.startDate;

  const assignments = assignSequentialMeetingDates(unit.lessons, meetingDates, fromDate);

  if (assignments.length === 0) {
    return { scheduledLessonIds: [] };
  }

  const updateLessonDateStmt = db.prepare("UPDATE lesson_plans SET date = ? WHERE id = ?");

  db.exec("BEGIN;");
  try {
    for (const assignment of assignments) {
      updateLessonDateStmt.run(assignment.date, assignment.id);
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return { scheduledLessonIds: assignments.map((assignment) => assignment.id) };
}

export type DuplicateLessonResult = {
  lessonId: string;
  date: string;
};

/**
 * "Extend to another day": duplicates a lesson onto its class's next actual
 * meeting date (cycle-day aware, not just the next calendar day), linked
 * back to the source lesson via continuesFromLessonId. Each day still shows
 * as its own lesson in the plan book and lesson bank.
 */
export function duplicateLessonAsContinuation(
  db: ClassPilotDatabase,
  userId: string,
  sourceLessonId: string,
): DuplicateLessonResult {
  const source = getLessonById(db, userId, sourceLessonId);

  if (!source) {
    throw notFound("Lesson", sourceLessonId);
  }

  if (!source.date) {
    throw new Error(
      "Can't extend an unscheduled lesson to another day -- give it a date first.",
    );
  }

  const unit = getUnitById(db, userId, source.unitId);

  if (!unit) {
    throw new Error(`Unit not found for lesson: ${sourceLessonId}`);
  }

  const classSection = getClassById(db, userId, unit.classId);

  if (!classSection) {
    throw new Error(`Class not found for unit: ${unit.id}`);
  }

  const schoolYear = getSchoolYearById(db, userId, classSection.schoolYearId);
  const scheduleSlots = getScheduleSlotRowsForClass(db, classSection.id);
  const nextDate = getNextClassMeetingDate(schoolYear, classSection, source.date, scheduleSlots);

  if (!nextDate) {
    throw new Error(
      `${classSection.name} has no more meeting days left in the school year after ${source.date}.`,
    );
  }

  const lessonId = createLesson(db, userId, {
    date: nextDate,
    durationMinutes: source.durationMinutes,
    outcomeIds: source.outcomeIds,
    sections: source.sections,
    status: "planned",
    summary: source.summary,
    title: continuationTitle(source.title),
    unitId: source.unitId,
    continuesFromLessonId: source.id,
  });

  return { lessonId, date: nextDate };
}

function continuationTitle(title: string): string {
  return /\(cont(?:'d|inued)?\)\s*$/i.test(title) ? title : `${title} (cont'd)`;
}

export function getPlannerData(db: ClassPilotDatabase, userId: string): PlannerData {
  const activeYearId = getActiveSchoolYearId(db, userId);
  const schoolYear = getSchoolYearById(db, userId, activeYearId);
  const classes = listClassesForSchoolYear(db, userId, activeYearId);

  const outcomes = db
    .prepare(
      "SELECT id, code, description, subject, grade, strand FROM curriculum_outcomes ORDER BY rowid",
    )
    .all() as CurriculumOutcomeRow[];

  const units = db
    .prepare(
      `SELECT id, class_id, title, start_date, end_date, color, outcome_ids_json, notes
       FROM unit_plans
       WHERE class_id IN (SELECT id FROM class_sections WHERE school_year_id = ?)
       ORDER BY start_date, rowid`,
    )
    .all(activeYearId) as UnitPlanRow[];

  const lessons = db
    .prepare(
      `SELECT id, unit_id, title, date, sequence, duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id
       FROM lesson_plans
       WHERE unit_id IN (SELECT id FROM unit_plans WHERE class_id IN (SELECT id FROM class_sections WHERE school_year_id = ?))
       ORDER BY sequence, rowid`,
    )
    .all(activeYearId) as LessonPlanRow[];

  return {
    schoolYear,
    classes,
    outcomes: outcomes.map(mapCurriculumOutcome),
    units: units.map((unit) =>
      mapUnitPlan(
        unit,
        lessons.filter((lesson) => lesson.unit_id === unit.id),
      ),
    ),
  };
}

function mapSchoolYear(row: SchoolYearRow): SchoolYear {
  return {
    id: row.id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    blockedDates: parseBlockedDates(row.blocked_dates_json),
    cycleLength: row.cycle_length_days,
    dayLabelScheme: row.day_label_scheme,
  };
}

// Accepts both the current labeled form and the legacy string[] form so older
// databases keep working after the calendar setup feature shipped.
// `advancesCycle` defaults to true for both legacy forms so pre-existing
// entries keep their prior "cycle keeps ticking through this day" behavior.
function parseBlockedDates(json: string): NonInstructionalDay[] {
  const parsed = JSON.parse(json) as Array<string | Partial<NonInstructionalDay>>;

  return parsed
    .map((entry): NonInstructionalDay =>
      typeof entry === "string"
        ? { date: entry, label: "", advancesCycle: true }
        : {
            date: entry.date ?? "",
            label: entry.label ?? "",
            advancesCycle: entry.advancesCycle ?? true,
          },
    )
    .sort((left, right) => left.date.localeCompare(right.date));
}

function mapClassSection(row: ClassSectionRow): ClassSection {
  return {
    id: row.id,
    schoolYearId: row.school_year_id,
    name: row.name,
    subject: row.subject,
    grade: row.grade,
    room: row.room,
    meetingPattern: row.meeting_pattern,
    cycleDays: JSON.parse(row.cycle_days_json) as number[],
    targetMinutesPerYear: row.target_minutes_per_year ?? undefined,
    color: row.color,
    isInstructional: row.is_instructional !== 0,
    combinedGrades: JSON.parse(row.combined_grades_json) as string[],
  };
}

function mapCurriculumOutcome(row: CurriculumOutcomeRow): CurriculumOutcome {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    subject: row.subject,
    grade: row.grade,
    strand: row.strand,
  };
}

function mapUnitPlan(row: UnitPlanRow, lessonRows: LessonPlanRow[]): UnitPlan {
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    outcomeIds: JSON.parse(row.outcome_ids_json) as string[],
    lessons: lessonRows.map(mapLessonPlan),
    notes: row.notes,
  };
}

function mapLessonPlan(row: LessonPlanRow): LessonPlan {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    sequence: row.sequence,
    durationMinutes: row.duration_minutes,
    status: row.status,
    outcomeIds: JSON.parse(row.outcome_ids_json) as string[],
    sections: parseLessonSections(row.sections_json, row.summary),
    summary: row.summary,
    continuesFromLessonId: row.continues_from_lesson_id ?? undefined,
  };
}

function normalizeLessonSections(
  sections: LessonSections | undefined,
  summary: string,
): LessonSections {
  return {
    assessment: sections?.assessment ?? "",
    differentiation: sections?.differentiation ?? "",
    learningGoals: sections?.learningGoals ?? "",
    lessonFlow: sections?.lessonFlow ?? summary,
    materials: sections?.materials ?? "",
    mindsOn: sections?.mindsOn ?? "",
    reflection: sections?.reflection ?? "",
    resources: sections?.resources ?? "",
  };
}

function parseLessonSections(
  sectionsJson: string | undefined,
  summary: string,
): LessonSections {
  if (!sectionsJson || sectionsJson === "{}") {
    return normalizeLessonSections(undefined, summary);
  }

  return normalizeLessonSections(
    JSON.parse(sectionsJson) as Partial<LessonSections> as LessonSections,
    summary,
  );
}
