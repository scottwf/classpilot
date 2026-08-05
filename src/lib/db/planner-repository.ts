import type {
  ClassSection,
  CurriculumOutcome,
  LessonSections,
  LessonPlan,
  NonInstructionalDay,
  PlannerData,
  SchoolYear,
  UnitPlan,
} from "@/src/features/planner/types";
import { getClassMeetingDates, getNextClassMeetingDate } from "@/src/features/planner/cycle";
import { computeCascadeShift } from "@/src/features/planner/reschedule";
import type { ClassPilotDatabase } from "./sqlite";

const defaultSchoolYearId = "current";

type SchoolYearRow = {
  title: string;
  start_date: string;
  end_date: string;
  blocked_dates_json: string;
  cycle_length_days: number;
};

type ClassSectionRow = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  room: string;
  meeting_pattern: string;
  cycle_days_json: string;
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
  color: UnitPlan["color"];
  outcome_ids_json: string;
};

type LessonPlanRow = {
  id: string;
  unit_id: string;
  title: string;
  date: string;
  duration_minutes: number;
  status: LessonPlan["status"];
  outcome_ids_json: string;
  sections_json: string;
  summary: string;
  continues_from_lesson_id: string | null;
};

export type CreateLessonInput = {
  date: string;
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
  color: UnitPlan["color"];
  endDate: string;
  outcomeIds: string[];
  startDate: string;
  title: string;
};

export type EditableUnit = UnitPlan;

export type UpdateUnitInput = CreateUnitInput & {
  id: string;
};

export type CreateClassInput = {
  name: string;
  subject: string;
  grade: string;
  room: string;
  meetingPattern: string;
  cycleDays: number[];
};

export type UpdateClassInput = CreateClassInput & {
  id: string;
};

export function isPlannerSeeded(db: ClassPilotDatabase): boolean {
  const row = db
    .prepare("SELECT 1 FROM school_years WHERE id = ? LIMIT 1")
    .get(defaultSchoolYearId) as { 1: number } | undefined;

  return row !== undefined;
}

export function seedPlannerData(db: ClassPilotDatabase, plannerData: PlannerData) {
  const insertSchoolYear = db.prepare(`
    INSERT INTO school_years (id, title, start_date, end_date, blocked_dates_json, cycle_length_days)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      blocked_dates_json = excluded.blocked_dates_json,
      cycle_length_days = excluded.cycle_length_days
  `);

  const insertClass = db.prepare(`
    INSERT INTO class_sections (id, name, subject, grade, room, meeting_pattern, cycle_days_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      subject = excluded.subject,
      grade = excluded.grade,
      room = excluded.room,
      meeting_pattern = excluded.meeting_pattern,
      cycle_days_json = excluded.cycle_days_json
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
    INSERT INTO lesson_plans (id, unit_id, title, date, duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      unit_id = excluded.unit_id,
      title = excluded.title,
      date = excluded.date,
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
      defaultSchoolYearId,
      plannerData.schoolYear.title,
      plannerData.schoolYear.startDate,
      plannerData.schoolYear.endDate,
      JSON.stringify(plannerData.schoolYear.blockedDates),
      plannerData.schoolYear.cycleLength,
    );

    for (const classSection of plannerData.classes) {
      insertClass.run(
        classSection.id,
        classSection.name,
        classSection.subject,
        classSection.grade,
        classSection.room,
        classSection.meetingPattern,
        JSON.stringify(classSection.cycleDays),
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
        unit.color,
        JSON.stringify(unit.outcomeIds),
      );

      for (const lesson of unit.lessons) {
        insertLesson.run(
          lesson.id,
          unit.id,
          lesson.title,
          lesson.date,
          lesson.durationMinutes,
          lesson.status,
          JSON.stringify(lesson.outcomeIds),
          JSON.stringify(normalizeLessonSections(lesson.sections, lesson.summary)),
          lesson.summary,
          lesson.continuesFromLessonId ?? null,
        );
      }
    }

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export function getPlannerData(db: ClassPilotDatabase): PlannerData {
  const schoolYearRow = db
    .prepare(
      "SELECT title, start_date, end_date, blocked_dates_json, cycle_length_days FROM school_years WHERE id = ?",
    )
    .get(defaultSchoolYearId) as SchoolYearRow | undefined;

  if (!schoolYearRow) {
    throw new Error("ClassPilot database has not been seeded.");
  }

  const classes = db
    .prepare(
      "SELECT id, name, subject, grade, room, meeting_pattern, cycle_days_json FROM class_sections ORDER BY rowid",
    )
    .all() as ClassSectionRow[];

  const outcomes = db
    .prepare(
      "SELECT id, code, description, subject, grade, strand FROM curriculum_outcomes ORDER BY rowid",
    )
    .all() as CurriculumOutcomeRow[];

  const units = db
    .prepare(
      "SELECT id, class_id, title, start_date, end_date, color, outcome_ids_json FROM unit_plans ORDER BY start_date, rowid",
    )
    .all() as UnitPlanRow[];

  const lessons = db
    .prepare(
      "SELECT id, unit_id, title, date, duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id FROM lesson_plans ORDER BY date, rowid",
    )
    .all() as LessonPlanRow[];

  return {
    schoolYear: mapSchoolYear(schoolYearRow),
    classes: classes.map(mapClassSection),
    outcomes: outcomes.map(mapCurriculumOutcome),
    units: units.map((unit) =>
      mapUnitPlan(
        unit,
        lessons.filter((lesson) => lesson.unit_id === unit.id),
      ),
    ),
  };
}

export function getSchoolYear(db: ClassPilotDatabase): SchoolYear {
  const row = db
    .prepare(
      "SELECT title, start_date, end_date, blocked_dates_json, cycle_length_days FROM school_years WHERE id = ?",
    )
    .get(defaultSchoolYearId) as SchoolYearRow | undefined;

  if (!row) {
    throw new Error("ClassPilot database has not been seeded.");
  }

  return mapSchoolYear(row);
}

export type UpdateSchoolYearInput = {
  title: string;
  startDate: string;
  endDate: string;
  blockedDates: NonInstructionalDay[];
  cycleLength: number;
};

export function updateSchoolYear(
  db: ClassPilotDatabase,
  input: UpdateSchoolYearInput,
) {
  const blockedDates = [...input.blockedDates].sort((left, right) =>
    left.date.localeCompare(right.date),
  );

  const result = db
    .prepare(
      `UPDATE school_years
       SET title = ?, start_date = ?, end_date = ?, blocked_dates_json = ?, cycle_length_days = ?
       WHERE id = ?`,
    )
    .run(
      input.title,
      input.startDate,
      input.endDate,
      JSON.stringify(blockedDates),
      input.cycleLength,
      defaultSchoolYearId,
    );

  if (result.changes === 0) {
    throw new Error("School year not found.");
  }
}

export function createLesson(
  db: ClassPilotDatabase,
  input: CreateLessonInput,
): string {
  const id = `lesson-${crypto.randomUUID()}`;

  db.prepare(`
    INSERT INTO lesson_plans (id, unit_id, title, date, duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.unitId,
    input.title,
    input.date,
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
  id: string,
): EditableLesson | undefined {
  const row = db
    .prepare(
      "SELECT id, unit_id, title, date, duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id FROM lesson_plans WHERE id = ?",
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
  input: UpdateLessonInput,
) {
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
    input.date,
    input.durationMinutes,
    input.status,
    JSON.stringify(input.outcomeIds),
    JSON.stringify(normalizeLessonSections(input.sections, input.summary)),
    input.summary,
    input.id,
  );

  if (result.changes === 0) {
    throw new Error(`Lesson not found: ${input.id}`);
  }
}

export function createUnit(
  db: ClassPilotDatabase,
  input: CreateUnitInput,
): string {
  const id = `unit-${crypto.randomUUID()}`;

  db.prepare(`
    INSERT INTO unit_plans (id, class_id, title, start_date, end_date, color, outcome_ids_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.classId,
    input.title,
    input.startDate,
    input.endDate,
    input.color,
    JSON.stringify(input.outcomeIds),
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
  input: CreateUnitWithLessonsInput,
): string {
  const unitId = `unit-${crypto.randomUUID()}`;

  const insertUnit = db.prepare(`
    INSERT INTO unit_plans (id, class_id, title, start_date, end_date, color, outcome_ids_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLesson = db.prepare(`
    INSERT INTO lesson_plans (id, unit_id, title, date, duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN;");
  try {
    insertUnit.run(
      unitId,
      input.unit.classId,
      input.unit.title,
      input.unit.startDate,
      input.unit.endDate,
      input.unit.color,
      JSON.stringify(input.unit.outcomeIds),
    );

    for (const lesson of input.lessons) {
      insertLesson.run(
        `lesson-${crypto.randomUUID()}`,
        unitId,
        lesson.title,
        lesson.date,
        lesson.durationMinutes,
        lesson.status,
        JSON.stringify(lesson.outcomeIds),
        JSON.stringify(normalizeLessonSections(lesson.sections, lesson.summary)),
        lesson.summary,
        null,
      );
    }

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return unitId;
}

export function getUnitById(
  db: ClassPilotDatabase,
  id: string,
): EditableUnit | undefined {
  const row = db
    .prepare(
      "SELECT id, class_id, title, start_date, end_date, color, outcome_ids_json FROM unit_plans WHERE id = ?",
    )
    .get(id) as UnitPlanRow | undefined;

  if (!row) {
    return undefined;
  }

  const lessons = db
    .prepare(
      "SELECT id, unit_id, title, date, duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id FROM lesson_plans WHERE unit_id = ? ORDER BY date, rowid",
    )
    .all(id) as LessonPlanRow[];

  return mapUnitPlan(row, lessons);
}

export function updateUnit(
  db: ClassPilotDatabase,
  input: UpdateUnitInput,
) {
  const result = db.prepare(`
    UPDATE unit_plans
    SET
      class_id = ?,
      title = ?,
      start_date = ?,
      end_date = ?,
      color = ?,
      outcome_ids_json = ?
    WHERE id = ?
  `).run(
    input.classId,
    input.title,
    input.startDate,
    input.endDate,
    input.color,
    JSON.stringify(input.outcomeIds),
    input.id,
  );

  if (result.changes === 0) {
    throw new Error(`Unit not found: ${input.id}`);
  }
}

export function createClass(db: ClassPilotDatabase, input: CreateClassInput): string {
  const id = `class-${crypto.randomUUID()}`;

  db.prepare(`
    INSERT INTO class_sections (id, name, subject, grade, room, meeting_pattern, cycle_days_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.subject,
    input.grade,
    input.room,
    input.meetingPattern,
    JSON.stringify(input.cycleDays),
  );

  return id;
}

export function updateClass(db: ClassPilotDatabase, input: UpdateClassInput) {
  const result = db.prepare(`
    UPDATE class_sections
    SET
      name = ?,
      subject = ?,
      grade = ?,
      room = ?,
      meeting_pattern = ?,
      cycle_days_json = ?
    WHERE id = ?
  `).run(
    input.name,
    input.subject,
    input.grade,
    input.room,
    input.meetingPattern,
    JSON.stringify(input.cycleDays),
    input.id,
  );

  if (result.changes === 0) {
    throw new Error(`Class not found: ${input.id}`);
  }
}

export function getClassById(db: ClassPilotDatabase, id: string): ClassSection | undefined {
  const row = db
    .prepare(
      "SELECT id, name, subject, grade, room, meeting_pattern, cycle_days_json FROM class_sections WHERE id = ?",
    )
    .get(id) as ClassSectionRow | undefined;

  return row ? mapClassSection(row) : undefined;
}

// Units (and therefore lessons) cascade-delete via the class_sections FK, so
// deleting a class removes its units/lessons too — same as deleting a unit
// removes its lessons.
export function deleteClass(db: ClassPilotDatabase, id: string) {
  db.prepare("DELETE FROM class_sections WHERE id = ?").run(id);
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
  input: CascadeRescheduleInput,
): CascadeRescheduleResult {
  const unit = getUnitById(db, input.unitId);

  if (!unit) {
    throw new Error(`Unit not found: ${input.unitId}`);
  }

  const classSection = getClassById(db, unit.classId);

  if (!classSection) {
    throw new Error(`Class not found for unit: ${input.unitId}`);
  }

  const schoolYear = getSchoolYear(db);
  const meetingDates = getClassMeetingDates(schoolYear, classSection);
  const shifts = computeCascadeShift(
    unit.lessons,
    input.fromDate,
    meetingDates,
    input.shiftByDays,
  );

  if (shifts.length === 0) {
    return { shiftedLessonIds: [] };
  }

  const updateLessonDate = db.prepare("UPDATE lesson_plans SET date = ? WHERE id = ?");

  db.exec("BEGIN;");
  try {
    for (const shift of shifts) {
      updateLessonDate.run(shift.date, shift.id);
    }
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }

  return { shiftedLessonIds: shifts.map((shift) => shift.id) };
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
  sourceLessonId: string,
): DuplicateLessonResult {
  const source = getLessonById(db, sourceLessonId);

  if (!source) {
    throw new Error(`Lesson not found: ${sourceLessonId}`);
  }

  const unit = getUnitById(db, source.unitId);

  if (!unit) {
    throw new Error(`Unit not found for lesson: ${sourceLessonId}`);
  }

  const classSection = getClassById(db, unit.classId);

  if (!classSection) {
    throw new Error(`Class not found for unit: ${unit.id}`);
  }

  const schoolYear = getSchoolYear(db);
  const nextDate = getNextClassMeetingDate(schoolYear, classSection, source.date);

  if (!nextDate) {
    throw new Error(
      `${classSection.name} has no more meeting days left in the school year after ${source.date}.`,
    );
  }

  const lessonId = createLesson(db, {
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

function mapSchoolYear(row: SchoolYearRow): SchoolYear {
  return {
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    blockedDates: parseBlockedDates(row.blocked_dates_json),
    cycleLength: row.cycle_length_days,
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
    name: row.name,
    subject: row.subject,
    grade: row.grade,
    room: row.room,
    meetingPattern: row.meeting_pattern,
    cycleDays: JSON.parse(row.cycle_days_json) as number[],
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
    color: row.color,
    outcomeIds: JSON.parse(row.outcome_ids_json) as string[],
    lessons: lessonRows.map(mapLessonPlan),
  };
}

function mapLessonPlan(row: LessonPlanRow): LessonPlan {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
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
