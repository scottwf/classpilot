import { createUnitWithLessons } from "@/src/lib/db/planner-repository";
import type { ClassPilotDatabase } from "@/src/lib/db/sqlite";
import { buildInstructionalDays } from "@/src/features/planner/timeline";
import { scheduleLessonDates } from "@/src/features/planner/schedule";
import type { LessonSections, PlannerData, UnitPlan } from "@/src/features/planner/types";
import type { UnitOutlineDraft } from "./types";

export type SaveUnitOutlineDraftInput = {
  classId: string;
  color: UnitPlan["color"];
  startDate: string;
  draft: UnitOutlineDraft;
  lessonsPerWeek: number;
  lessonMinutes: number;
  /** Outcomes the teacher (or the assistant, on their behalf) explicitly
   * picked before drafting — folded into the unit's outcomes alongside
   * whatever the model tagged on individual lessons. */
  selectedOutcomeIds: string[];
};

/**
 * Turns an AI-drafted unit outline into a real unit + lessons: schedules
 * lesson dates across the class's instructional days, folds the outline's
 * big ideas/essential questions/assessment/differentiation guidance into
 * the first lesson's sections (the unit model has no description field of
 * its own yet), and saves everything atomically via createUnitWithLessons.
 *
 * Shared by the /assistant form's save step and the assistant chat's
 * save_unit_from_outline tool so both produce identical results.
 */
export function saveUnitOutlineDraft(
  db: ClassPilotDatabase,
  userId: string,
  planner: PlannerData,
  input: SaveUnitOutlineDraftInput,
): string {
  const codeToId = new Map(planner.outcomes.map((outcome) => [outcome.code, outcome.id]));
  const instructionalDayKeys = buildInstructionalDays(planner.schoolYear).map((day) => day.key);
  const dates = scheduleLessonDates(
    instructionalDayKeys,
    input.startDate,
    input.draft.lessonSequence.length,
    input.lessonsPerWeek,
  );

  const lessons = input.draft.lessonSequence.map((lesson, index) => ({
    date: dates[index],
    durationMinutes: input.lessonMinutes,
    outcomeIds: lesson.outcomeCodes
      .map((code) => codeToId.get(code))
      .filter((id): id is string => Boolean(id)),
    sections: buildLessonSections(lesson.focus, index === 0 ? input.draft : undefined),
    status: "planned" as const,
    summary: lesson.focus,
    title: lesson.title,
  }));

  const unitOutcomeIds = Array.from(
    new Set([...input.selectedOutcomeIds, ...lessons.flatMap((lesson) => lesson.outcomeIds)]),
  );

  return createUnitWithLessons(db, userId, {
    unit: {
      classId: input.classId,
      color: input.color,
      endDate: dates[dates.length - 1],
      outcomeIds: unitOutcomeIds,
      startDate: dates[0],
      title: input.draft.title,
    },
    lessons,
  });
}

function buildLessonSections(
  focus: string,
  unitGuidance?: UnitOutlineDraft,
): LessonSections | undefined {
  if (!unitGuidance) {
    return focus ? { ...emptySections(), lessonFlow: focus } : undefined;
  }

  const learningGoals = [
    unitGuidance.bigIdeas.length
      ? `Big ideas:\n- ${unitGuidance.bigIdeas.join("\n- ")}`
      : "",
    unitGuidance.essentialQuestions.length
      ? `Essential questions:\n- ${unitGuidance.essentialQuestions.join("\n- ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    ...emptySections(),
    learningGoals,
    lessonFlow: focus,
    assessment: unitGuidance.assessmentIdeas.length
      ? `- ${unitGuidance.assessmentIdeas.join("\n- ")}`
      : "",
    differentiation: unitGuidance.differentiationNotes.length
      ? `- ${unitGuidance.differentiationNotes.join("\n- ")}`
      : "",
  };
}

function emptySections(): LessonSections {
  return {
    assessment: "",
    differentiation: "",
    learningGoals: "",
    lessonFlow: "",
    materials: "",
    mindsOn: "",
    reflection: "",
    resources: "",
  };
}
