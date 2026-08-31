import type {
  ClassColor,
  ClassSection,
  CurriculumOutcome,
  LessonPlan,
  PlannerData,
  UnitPlan,
} from "./types";
import { getUnitShadeIndex } from "./unit-color";

export type LessonBankSort = "date" | "subject" | "unit" | "outcome";

export type EnrichedLesson = LessonPlan & {
  classId: string;
  className: string;
  subject: string;
  grade: string;
  /** The parent class's color -- issue #27: lessons show color everywhere
   * now, matching the class/unit color hierarchy (see unit-color.ts). */
  classColor: ClassColor;
  unitId: string;
  unitTitle: string;
  /** Which shade tier of the class's hue this lesson's unit gets -- issue
   * #27, so a lesson row can show its unit in the same derived shade the
   * unit timeline uses. See unit-color.ts. */
  unitShadeIndex: number;
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
    const siblingUnits = data.units.filter((candidate) => candidate.classId === unit.classId);
    const shadeIndex = getUnitShadeIndex(unit.id, siblingUnits);

    return unit.lessons.map((lesson) =>
      enrichLesson(lesson, unit, classSection, outcomesById, shadeIndex),
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
      (lesson) => lesson.date !== null && lesson.date >= start && lesson.date <= end,
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

/** Plain calendar-day shift (not instructional-day aware) — for the Plan
 * Book's prev/next week navigation. */
export function shiftDateKey(dateKey: string, days: number): string {
  return toDateKey(addDays(parseDate(dateKey), days));
}

/**
 * Shifts by `days` weekdays, skipping Saturdays and Sundays entirely --
 * for the Plan Book's day-view prev/next (issue #40: a teacher never has
 * anything scheduled on a weekend, so landing on one is never useful).
 * Always steps forward at least once before checking, so starting from a
 * weekend itself (e.g. after a manual jump-to-date) still lands on the
 * next real weekday in the requested direction rather than getting stuck.
 */
export function shiftToWeekday(dateKey: string, days: number): string {
  let date = parseDate(dateKey);
  const step = days < 0 ? -1 : 1;
  let remaining = Math.abs(days);

  while (remaining > 0) {
    date = addDays(date, step);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }

  return toDateKey(date);
}

/**
 * The date the Plan Book should open to when the URL has no explicit
 * `?date=`. Today, if today falls within the school year; the school
 * year's first day with an actual lesson planned if today is still
 * before the year starts (so the dashboard isn't just an empty day);
 * the school year's last day if today is after it ends. Never lands on a
 * weekend (issue #46) -- same weekday-only rule the prev/next nav already
 * enforces via shiftToWeekday (issue #40), just applied to the initial
 * landing date too.
 */
export function resolvePlanBookDefaultDate(
  schoolYear: { startDate: string; endDate: string },
  lessonDates: string[],
  todayKey: string,
): string {
  const candidate = ((): string => {
    if (todayKey >= schoolYear.startDate && todayKey <= schoolYear.endDate) {
      return todayKey;
    }

    if (todayKey > schoolYear.endDate) {
      return schoolYear.endDate;
    }

    const firstLessonDate = lessonDates.filter((date) => date >= schoolYear.startDate).sort()[0];
    return firstLessonDate ?? schoolYear.startDate;
  })();

  const day = parseDate(candidate).getUTCDay();
  return day === 0 || day === 6 ? shiftToWeekday(candidate, 1) : candidate;
}

export type CourseOutlineUnit = {
  unit: UnitPlan;
  lessons: LessonPlan[];
};

/**
 * One class's units, chronologically, each paired with its lessons in unit
 * order -- the Course outline view's (#48) data shape. Doesn't invent
 * dates for undated lessons; the outline UI shows their persisted
 * `sequence` instead (issue #39's undated-lesson convention).
 */
export function buildCourseOutline(units: UnitPlan[], classId: string): CourseOutlineUnit[] {
  return units
    .filter((unit) => unit.classId === classId)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((unit) => ({ unit, lessons: unit.lessons }));
}

function enrichLesson(
  lesson: LessonPlan,
  unit: UnitPlan,
  classSection: ClassSection | undefined,
  outcomesById: Map<string, CurriculumOutcome>,
  unitShadeIndex: number,
): EnrichedLesson {
  return {
    ...lesson,
    classId: unit.classId,
    className: classSection?.name ?? "Unknown class",
    subject: classSection?.subject ?? "Unknown subject",
    grade: classSection?.grade ?? "",
    classColor: classSection?.color ?? "blue",
    unitId: unit.id,
    unitTitle: unit.title,
    unitShadeIndex,
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

/** Nulls (unscheduled lessons) sort last. */
function compareStrings(left: string | null, right: string | null): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
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
