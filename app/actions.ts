"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { saveDayNote } from "@/src/lib/db/day-notes-repository";

export async function saveDayNoteAction(formData: FormData) {
  const userId = await requireAuth();
  const schoolYearId = String(formData.get("schoolYearId") ?? "");
  const date = String(formData.get("date") ?? "");
  const body = String(formData.get("body") ?? "");
  const view = String(formData.get("view") ?? "day");

  saveDayNote(getClassPilotDatabase(), userId, { body, date, schoolYearId });

  redirect(`/?date=${date}&view=${view}`);
}
