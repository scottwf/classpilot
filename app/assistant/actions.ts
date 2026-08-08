"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { generateUnitOutline } from "@/src/lib/ai/unit-outline";
import { parseUnitOutlineDraft } from "@/src/lib/ai/parse";
import { saveUnitOutlineDraft } from "@/src/lib/ai/save-unit-outline";
import { AiError, type UnitOutlineDraft } from "@/src/lib/ai/types";
import type { UnitPlan } from "@/src/features/planner/types";

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

  let unitId: string;
  try {
    unitId = saveUnitOutlineDraft(getClassPilotDatabase(), planner, {
      classId,
      color,
      draft,
      lessonMinutes: values.lessonMinutes,
      lessonsPerWeek: values.lessonsPerWeek,
      selectedOutcomeIds: values.outcomeIds,
      startDate,
    });
  } catch {
    return fail("Could not save the unit. Please try again.");
  }

  redirect(`/units/${unitId}?created=1`);
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
