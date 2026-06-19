"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { createUnitWithLessons } from "@/src/lib/db/planner-repository";
import { buildInstructionalDays } from "@/src/features/planner/timeline";
import { scheduleLessonDates } from "@/src/features/planner/schedule";
import { generateUnitOutline } from "@/src/lib/ai/unit-outline";
import { parseUnitOutlineDraft } from "@/src/lib/ai/parse";
import { AiError, type UnitOutlineDraft } from "@/src/lib/ai/types";
import type { LessonSections, UnitPlan } from "@/src/features/planner/types";

const unitColors = new Set<UnitPlan["color"]>([
  "blue",
  "emerald",
  "amber",
  "rose",
  "violet",
]);

export type AssistantFormValues = {
  subject: string;
  grade: string;
  unitFocus: string;
  weeks: number;
  lessonsPerWeek: number;
  lessonMinutes: number;
  teachingNotes: string;
  outcomeIds: string[];
};

export type AssistantState =
  | { status: "idle" }
  | { status: "error"; error: string; values: AssistantFormValues }
  | {
      status: "success";
      draft: UnitOutlineDraft;
      values: AssistantFormValues;
      saveError?: string;
    };

export async function assistantAction(
  _prev: AssistantState,
  formData: FormData,
): Promise<AssistantState> {
  await requireAuth();

  const intent = String(formData.get("intent") ?? "generate");

  if (intent === "save") {
    return saveDraft(formData);
  }

  return generateDraft(formData);
}

async function generateDraft(formData: FormData): Promise<AssistantState> {
  const values = readFormValues(formData);

  if (!values.subject || !values.unitFocus) {
    return {
      status: "error",
      error: "Add a subject and a unit focus before drafting.",
      values,
    };
  }

  const planner = getClassPilotPlannerData();
  const selected = new Set(values.outcomeIds);
  const outcomes = planner.outcomes
    .filter((outcome) => selected.has(outcome.id))
    .map((outcome) => ({ code: outcome.code, description: outcome.description }));

  try {
    const draft = await generateUnitOutline({
      subject: values.subject,
      grade: values.grade || "6",
      unitFocus: values.unitFocus,
      weeks: values.weeks,
      lessonsPerWeek: values.lessonsPerWeek,
      lessonMinutes: values.lessonMinutes,
      teachingNotes: values.teachingNotes,
      outcomes,
    });

    return { status: "success", draft, values };
  } catch (error) {
    const message =
      error instanceof AiError
        ? error.message
        : "Something went wrong while drafting. Please try again.";

    return { status: "error", error: message, values };
  }
}

async function saveDraft(formData: FormData): Promise<AssistantState> {
  const values = readFormValues(formData);

  // Reconstruct the draft from the hidden field so a save error can re-render it
  // without re-calling the AI provider. parseUnitOutlineDraft re-validates shape.
  let draft: UnitOutlineDraft;
  try {
    draft = parseUnitOutlineDraft(String(formData.get("draft") ?? ""));
  } catch {
    return {
      status: "error",
      error: "Could not read the draft to save. Please draft it again.",
      values,
    };
  }

  const fail = (saveError: string): AssistantState => ({
    status: "success",
    draft,
    values,
    saveError,
  });

  if (draft.lessonSequence.length === 0) {
    return fail("This draft has no lessons to save.");
  }

  const classId = String(formData.get("classId") ?? "").trim();
  const color = String(formData.get("color") ?? "blue") as UnitPlan["color"];
  const startDate = String(formData.get("startDate") ?? "").trim();

  if (!classId) {
    return fail("Pick a class to add this unit to.");
  }

  if (!unitColors.has(color)) {
    return fail("Pick a valid color.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return fail("Pick a start date.");
  }

  const planner = getClassPilotPlannerData();

  if (!planner.classes.some((section) => section.id === classId)) {
    return fail("That class no longer exists.");
  }

  const codeToId = new Map(
    planner.outcomes.map((outcome) => [outcome.code, outcome.id]),
  );

  const instructionalDayKeys = buildInstructionalDays(planner.schoolYear).map(
    (day) => day.key,
  );
  const dates = scheduleLessonDates(
    instructionalDayKeys,
    startDate,
    draft.lessonSequence.length,
    values.lessonsPerWeek,
  );

  const lessons = draft.lessonSequence.map((lesson, index) => ({
    date: dates[index],
    durationMinutes: values.lessonMinutes,
    outcomeIds: lesson.outcomeCodes
      .map((code) => codeToId.get(code))
      .filter((id): id is string => Boolean(id)),
    sections: buildLessonSections(lesson.focus, index === 0 ? draft : undefined),
    status: "planned" as const,
    summary: lesson.focus,
    title: lesson.title,
  }));

  // Unit outcomes: the teacher's selected outcomes plus any the model tagged.
  const unitOutcomeIds = Array.from(
    new Set([
      ...values.outcomeIds,
      ...lessons.flatMap((lesson) => lesson.outcomeIds),
    ]),
  );

  let unitId: string;
  try {
    unitId = createUnitWithLessons(getClassPilotDatabase(), {
      unit: {
        classId,
        color,
        endDate: dates[dates.length - 1],
        outcomeIds: unitOutcomeIds,
        startDate: dates[0],
        title: draft.title,
      },
      lessons,
    });
  } catch {
    return fail("Could not save the unit. Please try again.");
  }

  redirect(`/units/${unitId}?created=1`);
}

// Folds the unit-level guidance into the first lesson's section fields so the
// big ideas, essential questions, assessment, and differentiation ideas are not
// lost when the draft is saved (the unit model has no description field yet).
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

function readFormValues(formData: FormData): AssistantFormValues {
  return {
    subject: String(formData.get("subject") ?? "").trim(),
    grade: String(formData.get("grade") ?? "").trim(),
    unitFocus: String(formData.get("unitFocus") ?? "").trim(),
    weeks: toPositiveInt(formData.get("weeks"), 4),
    lessonsPerWeek: toPositiveInt(formData.get("lessonsPerWeek"), 3),
    lessonMinutes: toPositiveInt(formData.get("lessonMinutes"), 45),
    teachingNotes: String(formData.get("teachingNotes") ?? "").trim(),
    outcomeIds: formData.getAll("outcomeIds").map(String),
  };
}

function toPositiveInt(value: FormDataEntryValue | null, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, 60);
}
