"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { duplicateLessonAsContinuation } from "@/src/lib/db/planner-repository";

export async function extendLessonAction(formData: FormData) {
  const userId = await requireAuth();

  const lessonId = String(formData.get("lessonId") ?? "").trim();

  if (!lessonId) {
    redirect("/lessons?error=missing");
  }

  // redirect() throws internally, so keep it out of the try/catch below —
  // otherwise a successful redirect would get swallowed as a thrown error.
  let newLessonId: string;
  try {
    newLessonId = duplicateLessonAsContinuation(getClassPilotDatabase(), userId, lessonId).lessonId;
  } catch {
    redirect(`/lessons/${lessonId}?error=extend`);
  }

  redirect(`/lessons/${newLessonId}`);
}
