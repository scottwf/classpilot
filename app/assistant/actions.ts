"use server";

import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { generateUnitOutline } from "@/src/lib/ai/unit-outline";
import { AiError, type UnitOutlineDraft } from "@/src/lib/ai/types";

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
  | { status: "success"; draft: UnitOutlineDraft; values: AssistantFormValues };

export async function generateUnitOutlineAction(
  _prev: AssistantState,
  formData: FormData,
): Promise<AssistantState> {
  await requireAuth();

  const values: AssistantFormValues = {
    subject: String(formData.get("subject") ?? "").trim(),
    grade: String(formData.get("grade") ?? "").trim(),
    unitFocus: String(formData.get("unitFocus") ?? "").trim(),
    weeks: toPositiveInt(formData.get("weeks"), 4),
    lessonsPerWeek: toPositiveInt(formData.get("lessonsPerWeek"), 3),
    lessonMinutes: toPositiveInt(formData.get("lessonMinutes"), 45),
    teachingNotes: String(formData.get("teachingNotes") ?? "").trim(),
    outcomeIds: formData.getAll("outcomeIds").map(String),
  };

  if (!values.subject || !values.unitFocus) {
    return {
      status: "error",
      error: "Add a subject and a unit focus before drafting.",
      values,
    };
  }

  // Resolve outcome ids to code + description on the server so only the minimal,
  // non-sensitive curriculum context is forwarded to the AI provider.
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

function toPositiveInt(value: FormDataEntryValue | null, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, 60);
}
