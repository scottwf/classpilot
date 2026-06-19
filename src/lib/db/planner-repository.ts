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
import type { ClassPilotDatabase } from "./sqlite";

const defaultSchoolYearId = "current";

type SchoolYearRow = {
  title: string;
  start_date: string;
  end_date: string;
  blocked_dates_json: string;
};

type ClassSectionRow = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  room: string;
  meeting_pattern: string;
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

export function isPlannerSeeded(db: ClassPilotDatabase): boolean {
  const row = db
    .prepare("SELECT 1 FROM school_years WHERE id = ? LIMIT 1")
    .get(defaultSchoolYearId) as { 1: number } | undefined;

  return row !== undefined;
}

export function seedPlannerData(db: ClassPilotDatabase, plannerData: PlannerData) {
  const insertSchoolYear = db.prepare(`
    INSERT INTO school_years (id, title, start_date, end_date, blocked_dates_json)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      blocked_dates_json = excluded.blocked_dates_json
  `);

  const insertClass = db.prepare(`
    INSERT INTO class_sections (id, name, subject, grade, room, meeting_pattern)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      subject = excluded.subject,
      grade = excluded.grade,
      room = excluded.room,
      meeting_pattern = excluded.meeting_pattern
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
    INSERT INTO lesson_plans (id, unit_id, title, date, duration_minutes, status, outcome_ids_json, sections_json, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      unit_id = excluded.unit_id,
      title = excluded.title,
      date = excluded.date,
      duration_minutes = excluded.duration_minutes,
      status = excluded.status,
      outcome_ids_json = excluded.outcome_ids_json,
      sections_json = excluded.sections_json,
      summary = excluded.summary
  `);

  db.exec("BEGIN;");
  try {
    insertSchoolYear.run(
      defaultSchoolYearId,
      plannerData.schoolYear.title,
      plannerData.schoolYear.startDate,
      plannerData.schoolYear.endDate,
      JSON.stringify(plannerData.schoolYear.blockedDates),
    );

    for (const classSection of plannerData.classes) {
      insertClass.run(
        classSection.id,
        classSection.name,
        classSection.subject,
        classSection.grade,
        classSection.room,
        classSection.meetingPattern,
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
    .prepare("SELECT title, start_date, end_date, blocked_dates_json FROM school_years WHERE id = ?")
    .get(defaultSchoolYearId) as SchoolYearRow | undefined;

  if (!schoolYearRow) {
    throw new Error("ClassPilot database has not been seeded.");
  }

  const classes = db
    .prepare(
      "SELECT id, name, subject, grade, room, meeting_pattern FROM class_sections ORDER BY rowid",
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
      "SELECT id, unit_id, title, date, duration_minutes, status, outcome_ids_json, sections_json, summary FROM lesson_plans ORDER BY date, rowid",
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
      "SELECT title, start_date, end_date, blocked_dates_json FROM school_years WHERE id = ?",
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
       SET title = ?, start_date = ?, end_date = ?, blocked_dates_json = ?
       WHERE id = ?`,
    )
    .run(
      input.title,
      input.startDate,
      input.endDate,
      JSON.stringify(blockedDates),
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
    INSERT INTO lesson_plans (id, unit_id, title, date, duration_minutes, status, outcome_ids_json, sections_json, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  );

  return id;
}

export function getLessonById(
  db: ClassPilotDatabase,
  id: string,
): EditableLesson | undefined {
  const row = db
    .prepare(
      "SELECT id, unit_id, title, date, duration_minutes, status, outcome_ids_json, sections_json, summary FROM lesson_plans WHERE id = ?",
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
    INSERT INTO lesson_plans (id, unit_id, title, date, duration_minutes, status, outcome_ids_json, sections_json, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      "SELECT id, unit_id, title, date, duration_minutes, status, outcome_ids_json, sections_json, summary FROM lesson_plans WHERE unit_id = ? ORDER BY date, rowid",
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

function mapSchoolYear(row: SchoolYearRow): SchoolYear {
  return {
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    blockedDates: parseBlockedDates(row.blocked_dates_json),
  };
}

// Accepts both the current labeled form and the legacy string[] form so older
// databases keep working after the calendar setup feature shipped.
function parseBlockedDates(json: string): NonInstructionalDay[] {
  const parsed = JSON.parse(json) as Array<string | NonInstructionalDay>;

  return parsed
    .map((entry) =>
      typeof entry === "string"
        ? { date: entry, label: "" }
        : { date: entry.date, label: entry.label ?? "" },
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
