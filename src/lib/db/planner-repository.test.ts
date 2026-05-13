import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createClassPilotDatabase } from "./sqlite";
import {
  createLesson,
  createUnit,
  getLessonById,
  getPlannerData,
  getUnitById,
  seedPlannerData,
  updateLesson,
  updateUnit,
} from "./planner-repository";
import { plannerData } from "@/src/features/planner/seed-data";

function temporaryDatabasePath() {
  return join(mkdtempSync(join(tmpdir(), "classpilot-test-")), "test.sqlite");
}

describe("planner repository", () => {
  it("seeds and reads Grade 6 homeroom planner data from SQLite", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    const persistedPlanner = getPlannerData(db);

    expect(persistedPlanner.schoolYear.title).toBe(
      "2026-2027 Grade 6 Homeroom",
    );
    expect(persistedPlanner.classes.map((classSection) => classSection.name)).toContain(
      "Grade 6 Math",
    );
    expect(persistedPlanner.units.map((unit) => unit.title)).toContain(
      "Ratios, Rates, and Percent",
    );
    expect(
      persistedPlanner.units.find(
        (unit) => unit.title === "Ratios, Rates, and Percent",
      )?.lessons,
    ).toHaveLength(2);
  });

  it("can seed the same planner more than once without duplicating rows", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    seedPlannerData(db, plannerData);
    const persistedPlanner = getPlannerData(db);

    expect(persistedPlanner.classes).toHaveLength(plannerData.classes.length);
    expect(persistedPlanner.units).toHaveLength(plannerData.units.length);
    expect(persistedPlanner.outcomes).toHaveLength(plannerData.outcomes.length);
  });

  it("creates a lesson and reads it through the planner model", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    createLesson(db, {
      date: "2026-09-24",
      durationMinutes: 45,
      outcomeIds: [],
      status: "planned",
      summary: "Use grocery flyers to compare ratios and percent discounts.",
      title: "Percent in Flyers",
      unitId: "unit-ratios",
    });

    const persistedPlanner = getPlannerData(db);
    const mathUnit = persistedPlanner.units.find(
      (unit) => unit.id === "unit-ratios",
    );

    expect(mathUnit?.lessons.map((lesson) => lesson.title)).toContain(
      "Percent in Flyers",
    );
  });

  it("creates and updates structured lesson sections", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    const lessonId = createLesson(db, {
      date: "2026-09-24",
      durationMinutes: 45,
      outcomeIds: [],
      sections: {
        assessment: "Collect exit slips.",
        differentiation: "Offer ratio tables with partial labels.",
        learningGoals: "I can compare ratios in real examples.",
        lessonFlow: "Model one flyer example, then partner practice.",
        materials: "Grocery flyers, calculators, notebooks.",
        mindsOn: "Which deal is better?",
        reflection: "",
        resources: "https://example.com/ratio-flyers",
      },
      status: "planned",
      summary: "Use grocery flyers to compare ratios and percent discounts.",
      title: "Percent in Flyers",
      unitId: "unit-ratios",
    });

    updateLesson(db, {
      date: "2026-09-24",
      durationMinutes: 50,
      id: lessonId,
      outcomeIds: [],
      sections: {
        assessment: "Sort exit slips by confidence.",
        differentiation: "Meet with students who need unit-rate support.",
        learningGoals: "I can justify which flyer deal is better.",
        lessonFlow: "Compare examples, partner sort, written justification.",
        materials: "Flyers, highlighters, calculators.",
        mindsOn: "Estimate the better deal before calculating.",
        reflection: "Add more visual models next time.",
        resources: "https://example.com/unit-rate-video",
      },
      status: "planned",
      summary: "Compare flyer deals with ratio and percent reasoning.",
      title: "Percent in Flyers",
      unitId: "unit-ratios",
    });

    const lesson = getLessonById(db, lessonId);

    expect(lesson?.sections).toMatchObject({
      learningGoals: "I can justify which flyer deal is better.",
      materials: "Flyers, highlighters, calculators.",
      resources: "https://example.com/unit-rate-video",
      reflection: "Add more visual models next time.",
    });
  });

  it("updates an existing lesson and returns the edited values", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    updateLesson(db, {
      date: "2026-09-25",
      durationMinutes: 60,
      id: "lesson-ratio-language",
      outcomeIds: ["sk-grade-6-mathematics-n6-5"],
      status: "taught",
      summary: "Revised lesson after teaching ratio language.",
      title: "Ratio Language Reflection",
      unitId: "unit-ratios",
    });

    const lesson = getLessonById(db, "lesson-ratio-language");

    expect(lesson).toMatchObject({
      date: "2026-09-25",
      durationMinutes: 60,
      status: "taught",
      summary: "Revised lesson after teaching ratio language.",
      title: "Ratio Language Reflection",
      unitId: "unit-ratios",
    });
    expect(lesson?.outcomeIds).toEqual(["sk-grade-6-mathematics-n6-5"]);
  });

  it("creates and updates a unit through the planner model", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    const unitId = createUnit(db, {
      classId: "grade-6-math",
      color: "blue",
      endDate: "2026-12-04",
      outcomeIds: ["sk-grade-6-mathematics-p6-1"],
      startDate: "2026-11-16",
      title: "Patterns and Graphs",
    });

    updateUnit(db, {
      classId: "grade-6-math",
      color: "violet",
      endDate: "2026-12-11",
      id: unitId,
      outcomeIds: ["sk-grade-6-mathematics-p6-1", "sk-grade-6-mathematics-p6-2"],
      startDate: "2026-11-17",
      title: "Patterns, Tables, and Graphs",
    });

    const unit = getUnitById(db, unitId);

    expect(unit).toMatchObject({
      classId: "grade-6-math",
      color: "violet",
      endDate: "2026-12-11",
      startDate: "2026-11-17",
      title: "Patterns, Tables, and Graphs",
    });
    expect(unit?.outcomeIds).toEqual([
      "sk-grade-6-mathematics-p6-1",
      "sk-grade-6-mathematics-p6-2",
    ]);
  });
});
