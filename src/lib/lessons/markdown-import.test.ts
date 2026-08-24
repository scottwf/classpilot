import { describe, expect, it } from "vitest";
import { parseLessonMarkdown } from "./markdown-import";

describe("lesson markdown import parser", () => {
  it("parses the ClassPilot lesson template into lesson fields", () => {
    const lesson = parseLessonMarkdown(`
# Lesson: Patterns in Input Output Tables
Date: 2026-11-17
Duration minutes: 55
Unit: Patterns and Graphs
Status: planned
Outcomes: P6.1, P6.2

## Learning Goals
- I can describe a pattern rule.

## Materials
- Chart paper
- [Desmos activity](https://teacher.desmos.com/)

## Lesson Flow
1. Number talk
2. Partner table sort

## Assessment
- Exit slip
`);

    expect(lesson).toEqual({
      date: "2026-11-17",
      durationMinutes: 55,
      outcomeRefs: ["P6.1", "P6.2"],
      status: "planned",
      sections: {
        assessment: "- Exit slip",
        differentiation: "",
        learningGoals: "- I can describe a pattern rule.",
        lessonFlow: "1. Number talk\n2. Partner table sort",
        materials: "- Chart paper\n- [Desmos activity](https://teacher.desmos.com/)",
        mindsOn: "",
        reflection: "",
        resources: "",
      },
      summary: `# Lesson: Patterns in Input Output Tables

## Learning Goals
- I can describe a pattern rule.

## Materials
- Chart paper
- [Desmos activity](https://teacher.desmos.com/)

## Lesson Flow
1. Number talk
2. Partner table sort

## Assessment
- Exit slip`,
      title: "Patterns in Input Output Tables",
      unitRef: "Patterns and Graphs",
    });
  });

  it("rejects lessons without required metadata", () => {
    expect(() => parseLessonMarkdown("# Lesson: Missing pieces")).toThrow(
      "Lesson markdown is missing unit.",
    );
  });

  it("parses a lesson with no Date: line as unscheduled", () => {
    const lesson = parseLessonMarkdown(`
# Lesson: Ratio Language
Duration minutes: 55
Unit: Ratios and Rates
Status: planned

## Learning Goals
- I can use ratio language.
`);

    expect(lesson.date).toBeNull();
  });

  it("parses Date: TBD as unscheduled", () => {
    const lesson = parseLessonMarkdown(`
# Lesson: Ratio Language
Date: TBD
Duration minutes: 55
Unit: Ratios and Rates
Status: planned

## Learning Goals
- I can use ratio language.
`);

    expect(lesson.date).toBeNull();
  });

  it("rejects a Date: value that isn't a real date or TBD", () => {
    expect(() =>
      parseLessonMarkdown(`
# Lesson: Ratio Language
Date: next Tuesday
Duration minutes: 55
Unit: Ratios and Rates
Status: planned

## Learning Goals
- I can use ratio language.
`),
    ).toThrow("Lesson date must be in YYYY-MM-DD format, or TBD to leave it unscheduled.");
  });
});
