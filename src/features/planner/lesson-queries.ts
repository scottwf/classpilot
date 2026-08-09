import type {
  ClassColor,
  ClassSection,
  CurriculumOutcome,
  LessonPlan,
  PlannerData,
  UnitPlan,
} from "./types";

export type LessonBankSort = "date" | "subject" | "unit" | "outcome";

export type EnrichedLesson = LessonPlan & {
  classId: string;
  className: string;
  subject: string;
  grade: string;
  unitId: string;
  unitTitle: string;
  outcomeCodes: string[];
};

export type LessonBankFilters = {
  subject?: string;
  unitId?: string;
  grade?: string;
  outcomeCode?: string;
};

export type LessonBankFilterOptions = {
  subjects: string[];
  units: Array<{ id: string; title: string }>;
  grades: string[];
  outcomeCodes: string[];
};

export type SubjectOutcomeCoverage = {
  classId: string;
  subject: string;
  color: ClassColor;
  covered: CurriculumOutcome[];
  planned: CurriculumOutcome[];
  uncovered: CurriculumOutcome[];
};

export function getAllLessons(data: PlannerData): EnrichedLesson[] {
  const classesById = new Map(data.classes.map((classSection) => [classSection.id, classSection]));
  const outcomesById = new Map(data.outcomes.map((outcome) => [outcome.id, outcome]));

  return data.units.flatMap((unit) => {
    const classSection = classesById.get(unit.classId);

    return unit.lessons.map((lesson) =>
      enrichLesson(lesson, unit, classSection, outcomesById),
    );
  });
}

export function getLessonsForDate(
  data: PlannerData,
  dateKey: string,
): EnrichedLesson[] {
  return sortByDate(getAllLessons(data).filter((lesson) => lesson.date === dateKey));
}

export function getLessonsForWeek(
  data: PlannerData,
  dateKey: string,
): EnrichedLesson[] {
  const { start, end } = getWeekRange(dateKey);

  return sortByDate(
    getAllLessons(data).filter(
      (lesson) => lesson.date >= start && lesson.date <= end,
    ),
  );
}

export function sortLessonBank(
  data: PlannerData,
  sort: LessonBankSort,
): EnrichedLesson[] {
  const lessons = getAllLessons(data);

  return [...lessons].sort((left, right) => {
    if (sort === "subject") {
      return compareStrings(left.subject, right.subject) || compareStrings(left.date, right.date);
    }

    if (sort === "unit") {
      return compareStrings(left.unitTitle, right.unitTitle) || compareStrings(left.date, right.date);
    }

    if (sort === "outcome") {
      return (
        compareStrings(left.outcomeCodes[0] ?? "", right.outcomeCodes[0] ?? "") ||
        compareStrings(left.date, right.date)
      );
    }

    return compareStrings(left.date, right.date);
  });
}

/** Empty string in any filter field means "no filter" for that field. */
export function filterLessonBank(
  lessons: EnrichedLesson[],
  filters: LessonBankFilters,
): EnrichedLesson[] {
  return lessons.filter((lesson) => {
    if (filters.subject && lesson.subject !== filters.subject) return false;
    if (filters.unitId && lesson.unitId !== filters.unitId) return false;
    if (filters.grade && lesson.grade !== filters.grade) return false;
    if (filters.outcomeCode && !lesson.outcomeCodes.includes(filters.outcomeCode)) return false;
    return true;
  });
}

/** Distinct filter values actually present in the lesson bank, sorted for
 * stable dropdown ordering — rebuilt from `lessons` so a filter never
 * offers an option that would produce zero results. */
export function buildLessonBankFilterOptions(
  lessons: EnrichedLesson[],
): LessonBankFilterOptions {
  const unitsById = new Map(lessons.map((lesson) => [lesson.unitId, lesson.unitTitle]));

  return {
    subjects: uniqueSorted(lessons.map((lesson) => lesson.subject)),
    units: Array.from(unitsById.entries())
      .map(([id, title]) => ({ id, title }))
      .sort((left, right) => compareStrings(left.title, right.title)),
    grades: uniqueSorted(lessons.map((lesson) => lesson.grade).filter(Boolean)),
    outcomeCodes: uniqueSorted(lessons.flatMap((lesson) => lesson.outcomeCodes)),
  };
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort(compareStrings);
}

export function buildOutcomeCoverage(data: PlannerData): SubjectOutcomeCoverage[] {
  // Non-instructional blocks (recess, supervision, assemblies) have no
  // curriculum outcomes to cover.
  return data.classes.filter((classSection) => classSection.isInstructional).map((classSection) => {
    const classUnits = data.units.filter((unit) => unit.classId === classSection.id);
    const subjectOutcomes = data.outcomes.filter(
      (outcome) => outcome.subject === classSection.subject,
    );
    const coveredIds = new Set(
      classUnits.flatMap((unit) =>
        unit.lessons
          .filter((lesson) => lesson.status === "taught")
          .flatMap((lesson) => lesson.outcomeIds),
      ),
    );
    const plannedIds = new Set(
      classUnits.flatMap((unit) => [
        ...unit.outcomeIds,
        ...unit.lessons
          .filter((lesson) => lesson.status !== "taught")
          .flatMap((lesson) => lesson.outcomeIds),
      ]),
    );

    return {
      classId: classSection.id,
      subject: classSection.subject,
      color: classSection.color,
      covered: subjectOutcomes.filter((outcome) => coveredIds.has(outcome.id)),
      planned: subjectOutcomes.filter(
        (outcome) => !coveredIds.has(outcome.id) && plannedIds.has(outcome.id),
      ),
      uncovered: subjectOutcomes.filter(
        (outcome) => !coveredIds.has(outcome.id) && !plannedIds.has(outcome.id),
      ),
    };
  });
}

export function getWeekRange(dateKey: string): { start: string; end: string } {
  const date = parseDate(dateKey);
  const day = date.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const monday = addDays(date, -daysSinceMonday);
  const friday = addDays(monday, 4);

  return {
    start: toDateKey(monday),
    end: toDateKey(friday),
  };
}

/** The five weekday date keys (Monday..Friday) of the week containing
 * dateKey — the columns of Plan Book's week view. */
export function getWeekdayDates(dateKey: string): string[] {
  const { start } = getWeekRange(dateKey);
  const monday = parseDate(start);

  return Array.from({ length: 5 }, (_, index) => toDateKey(addDays(monday, index)));
}

function enrichLesson(
  lesson: LessonPlan,
  unit: UnitPlan,
  classSection: ClassSection | undefined,
  outcomesById: Map<string, CurriculumOutcome>,
): EnrichedLesson {
  return {
    ...lesson,
    classId: unit.classId,
    className: classSection?.name ?? "Unknown class",
    subject: classSection?.subject ?? "Unknown subject",
    grade: classSection?.grade ?? "",
    unitId: unit.id,
    unitTitle: unit.title,
    outcomeCodes: lesson.outcomeIds.map(
      (outcomeId) => outcomesById.get(outcomeId)?.code ?? outcomeId,
    ),
  };
}

function sortByDate(lessons: EnrichedLesson[]): EnrichedLesson[] {
  return [...lessons].sort(
    (left, right) =>
      compareStrings(left.date, right.date) ||
      compareStrings(left.subject, right.subject),
  );
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right, "en-CA");
}

function parseDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
