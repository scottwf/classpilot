"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { saveDayNote } from "@/src/lib/db/day-notes-repository";
import {
  createScheduleException,
  deleteScheduleException,
} from "@/src/lib/db/schedule-exceptions-repository";

export async function saveDayNoteAction(formData: FormData) {
  const userId = await requireAuth();
  const schoolYearId = String(formData.get("schoolYearId") ?? "");
  const date = String(formData.get("date") ?? "");
  const body = String(formData.get("body") ?? "");
  const view = String(formData.get("view") ?? "day");

  saveDayNote(getClassPilotDatabase(), userId, { body, date, schoolYearId });

  redirect(`/?date=${date}&view=${view}`);
}

/** "Cancel this class today" -- marks a class's meeting on a date as
 * replaced by a non-academic event, bumping any already-scheduled lesson
 * forward one meeting day (see createScheduleException). */
export async function cancelClassMeetingAction(formData: FormData) {
  const userId = await requireAuth();
  const classId = String(formData.get("classId") ?? "");
  const date = String(formData.get("date") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const substituteClassId = String(formData.get("substituteClassId") ?? "").trim() || undefined;
  const view = String(formData.get("view") ?? "day");

  const result = createScheduleException(getClassPilotDatabase(), userId, {
    classId,
    date,
    label,
    substituteClassId,
  });

  const notice = result.shiftedLessonCount > 0 ? "&notice=lesson-moved" : "";
  redirect(`/?date=${date}&view=${view}${notice}`);
}

/** "Restore class" -- undoes cancelClassMeetingAction. Doesn't move any
 * lesson that was already bumped back. */
export async function restoreClassMeetingAction(formData: FormData) {
  const userId = await requireAuth();
  const exceptionId = String(formData.get("exceptionId") ?? "");
  const date = String(formData.get("date") ?? "");
  const view = String(formData.get("view") ?? "day");

  deleteScheduleException(getClassPilotDatabase(), userId, exceptionId);

  redirect(`/?date=${date}&view=${view}`);
}
