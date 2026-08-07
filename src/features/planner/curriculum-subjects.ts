import type { CurriculumOutcome } from "./types";

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
