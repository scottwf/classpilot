import type { ClassSection, CurriculumOutcome } from "./types";

export type GradeSubjects = {
  grade: string;
  subjects: string[];
};

/**
 * Groups the subjects that have curriculum outcomes loaded, by grade —
 * what the "select a grade, then pick a subject" curriculum picker (class
 * creation, onboarding wizard) renders as grouped options. Grades and
 * subjects are both sorted for stable, predictable ordering.
 */
export function groupSubjectsByGrade(outcomes: CurriculumOutcome[]): GradeSubjects[] {
  const subjectsByGrade = new Map<string, Set<string>>();

  for (const outcome of outcomes) {
    const subjects = subjectsByGrade.get(outcome.grade) ?? new Set<string>();
    subjects.add(outcome.subject);
    subjectsByGrade.set(outcome.grade, subjects);
  }

  return Array.from(subjectsByGrade.entries())
    .map(([grade, subjects]) => ({
      grade,
      subjects: Array.from(subjects).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }));
}

/**
 * Display label for a class's grade(s) — "6", or "5/6" for a combined-grade
 * split class. `grade` stays the primary/display grade in storage;
 * `combinedGrades` only widens which outcomes apply.
 */
export function formatClassGrade(
  classSection: Pick<ClassSection, "grade" | "combinedGrades">,
): string {
  if (!classSection.combinedGrades || classSection.combinedGrades.length === 0) {
    return classSection.grade;
  }

  return [classSection.grade, ...classSection.combinedGrades]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .join("/");
}
