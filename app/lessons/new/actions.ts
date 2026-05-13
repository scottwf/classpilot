"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { createLesson } from "@/src/lib/db/planner-repository";
import {
  lessonSummaryFromSections,
  readLessonSections,
} from "@/src/lib/lessons/lesson-sections";

export async function createLessonAction(formData: FormData) {
  await requireAuth();

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

  createLesson(getClassPilotDatabase(), {
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

function requiredString(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    redirect(`/lessons/new?error=${key}`);
  }

  return value;
}
