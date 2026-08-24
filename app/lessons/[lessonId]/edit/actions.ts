"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { updateLesson } from "@/src/lib/db/planner-repository";
import type { LessonStatus } from "@/src/features/planner/types";
import {
  lessonSummaryFromSections,
  readLessonSections,
} from "@/src/lib/lessons/lesson-sections";

const validStatuses = new Set(["planned", "taught", "delayed", "skipped"]);

export async function updateLessonAction(formData: FormData) {
  const userId = await requireAuth();

  const id = requiredString(formData, "id");
  const title = requiredString(formData, "title");
  const date = optionalString(formData, "date");
  const unitId = requiredString(formData, "unitId");
  const sections = readLessonSections(formData);
  const summary = lessonSummaryFromSections(
    sections,
    String(formData.get("summary") ?? ""),
  );
  const durationMinutes = Number(formData.get("durationMinutes"));
  const status = String(formData.get("status") ?? "planned");
  const outcomeIds = formData.getAll("outcomeIds").map(String);

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    redirect(`/lessons/${id}/edit?error=duration`);
  }

  if (!validStatuses.has(status)) {
    redirect(`/lessons/${id}/edit?error=status`);
  }

  updateLesson(getClassPilotDatabase(), userId, {
    date,
    durationMinutes,
    id,
    outcomeIds,
    sections,
    status: status as LessonStatus,
    summary,
    title,
    unitId,
  });

  redirect("/lessons?updated=1");
}

/** Empty string means "leave unscheduled" for the date field (issue #39). */
function optionalString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function requiredString(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    redirect("/lessons?error=missing");
  }

  return value;
}
