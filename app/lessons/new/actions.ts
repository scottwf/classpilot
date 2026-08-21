"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { createLesson, updateLessonDate } from "@/src/lib/db/planner-repository";
import {
  lessonSummaryFromSections,
  readLessonSections,
} from "@/src/lib/lessons/lesson-sections";
import { generateLessonSections } from "@/src/lib/ai/lesson-draft";
import { AiError } from "@/src/lib/ai/types";
import type { LessonSections } from "@/src/features/planner/types";

export type DraftLessonSectionsInput = {
  classId: string;
  unitTitle: string;
  lessonTitle: string;
  lessonFocus: string;
  lessonMinutes: number;
  teachingNotes: string;
  outcomeIds: string[];
};

export type DraftLessonSectionsResult =
  | { ok: true; sections: LessonSections; summary: string }
  | { ok: false; error: string };

/**
 * Drafts one lesson's structured sections via AI, called directly from the
 * lesson form's "Draft with AI" button (not a <form action> submit — the
 * result populates the form fields in place rather than redirecting). Only
 * curriculum/timing context is sent; see LessonDraftRequest's data-
 * minimization guarantee.
 */
export async function draftLessonSectionsAction(
  input: DraftLessonSectionsInput,
): Promise<DraftLessonSectionsResult> {
  const userId = await requireAuth();

  const planner = getClassPilotPlannerData(userId);
  const classSection = planner.classes.find((section) => section.id === input.classId);

  if (!classSection) {
    return { ok: false, error: "Pick a class before drafting." };
  }

  const classGrades = [classSection.grade, ...(classSection.combinedGrades ?? [])];
  const selected = new Set(input.outcomeIds);
  // Draft against the teacher's checked outcomes when there are any;
  // otherwise fall back to every outcome available for the class's
  // subject/grade(s) so the model still has curriculum context.
  const relevantOutcomes =
    selected.size > 0
      ? planner.outcomes.filter((outcome) => selected.has(outcome.id))
      : planner.outcomes.filter(
          (outcome) =>
            outcome.subject === classSection.subject && classGrades.includes(outcome.grade),
        );
  const outcomes = relevantOutcomes.map((outcome) => ({
    code: outcome.code,
    description: outcome.description,
  }));

  try {
    const sections = await generateLessonSections({
      subject: classSection.subject,
      grade: classSection.grade,
      unitTitle: input.unitTitle,
      lessonTitle: input.lessonTitle || "Untitled lesson",
      lessonFocus: input.lessonFocus,
      lessonMinutes: input.lessonMinutes,
      teachingNotes: input.teachingNotes,
      outcomes,
    });

    return {
      ok: true,
      sections,
      summary: lessonSummaryFromSections(sections, ""),
    };
  } catch (error) {
    const message =
      error instanceof AiError
        ? error.message
        : "Something went wrong while drafting. Please try again.";

    return { ok: false, error: message };
  }
}

export async function createLessonAction(formData: FormData) {
  const userId = await requireAuth();

  const title = requiredString(formData, "title");
  const date = requiredString(formData, "date");
  const unitId = requiredString(formData, "unitId");
  const sections = readLessonSections(formData);
  const summary = lessonSummaryFromSections(
    sections,
    String(formData.get("summary") ?? ""),
  );
  const durationMinutes = Number(formData.get("durationMinutes"));
  const outcomeIds = formData.getAll("outcomeIds").map(String);

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    redirect("/lessons/new?error=duration");
  }

  createLesson(getClassPilotDatabase(), userId, {
    date,
    durationMinutes,
    outcomeIds,
    sections,
    status: "planned",
    summary,
    title,
    unitId,
  });

  redirect(`/lessons?created=1`);
}

/**
 * Moves an existing lesson (picked from the bank) onto a clicked schedule
 * slot's date, instead of creating a new lesson — everything else about
 * the lesson (title, sections, outcomes, unit) stays as-is.
 */
export async function moveLessonToDateAction(formData: FormData) {
  const userId = await requireAuth();

  const lessonId = requiredString(formData, "lessonId");
  const date = requiredString(formData, "date");

  updateLessonDate(getClassPilotDatabase(), userId, { date, id: lessonId });

  redirect(`/?date=${date}`);
}

function requiredString(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    redirect(`/lessons/new?error=${key}`);
  }

  return value;
}
