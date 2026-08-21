import { describe, expect, it } from "vitest";
import { formatClassGrade, groupSubjectsByGrade } from "./curriculum-subjects";
import type { CurriculumOutcome } from "./types";

function outcome(overrides: Partial<CurriculumOutcome>): CurriculumOutcome {
  return {
    id: "id",
    code: "CODE",
    description: "",
    subject: "Mathematics",
    grade: "6",
    strand: "",
    ...overrides,
  };
}

describe("groupSubjectsByGrade", () => {
  it("groups subjects under their grade", () => {
    const outcomes = [
      outcome({ id: "1", subject: "Mathematics", grade: "6" }),
      outcome({ id: "2", subject: "Science", grade: "6" }),
      outcome({ id: "3", subject: "Mathematics", grade: "7" }),
    ];

    expect(groupSubjectsByGrade(outcomes)).toEqual([
      { grade: "6", subjects: ["Mathematics", "Science"] },
      { grade: "7", subjects: ["Mathematics"] },
    ]);
  });

  it("de-duplicates repeated (grade, subject) pairs across many outcomes", () => {
    const outcomes = [
      outcome({ id: "1", subject: "Mathematics", grade: "6" }),
      outcome({ id: "2", subject: "Mathematics", grade: "6" }),
      outcome({ id: "3", subject: "Mathematics", grade: "6" }),
    ];

    expect(groupSubjectsByGrade(outcomes)).toEqual([
      { grade: "6", subjects: ["Mathematics"] },
    ]);
  });

  it("sorts subjects alphabetically within a grade", () => {
    const outcomes = [
      outcome({ id: "1", subject: "Science", grade: "6" }),
      outcome({ id: "2", subject: "Arts Education", grade: "6" }),
      outcome({ id: "3", subject: "Mathematics", grade: "6" }),
    ];

    expect(groupSubjectsByGrade(outcomes)[0].subjects).toEqual([
      "Arts Education",
      "Mathematics",
      "Science",
    ]);
  });

  it("returns an empty array for no outcomes", () => {
    expect(groupSubjectsByGrade([])).toEqual([]);
  });
});

describe("formatClassGrade", () => {
  it("returns the plain grade for a single-grade class", () => {
    expect(formatClassGrade({ grade: "6", combinedGrades: [] })).toBe("6");
    expect(formatClassGrade({ grade: "6", combinedGrades: undefined })).toBe("6");
  });

  it("joins grades in numeric order for a combined-grade class", () => {
    expect(formatClassGrade({ grade: "6", combinedGrades: ["5"] })).toBe("5/6");
    expect(formatClassGrade({ grade: "5", combinedGrades: ["6"] })).toBe("5/6");
  });
});
