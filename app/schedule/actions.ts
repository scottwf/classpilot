"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { getActiveSchoolYearId } from "@/src/lib/db/planner-repository";
import {
  assignScheduleSlot,
  createPeriod,
  deletePeriod,
  getPeriods,
  removeScheduleSlot,
  updatePeriod,
} from "@/src/lib/db/schedule-repository";

function timePattern(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

export async function createPeriodAction(formData: FormData) {
  await requireAuth();

  const label = String(formData.get("label") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();

  if (!label || !timePattern(startTime) || !timePattern(endTime) || endTime <= startTime) {
    redirect("/schedule?error=period");
  }

  const db = getClassPilotDatabase();
  const schoolYearId = getActiveSchoolYearId(db);
  const nextSortOrder = getPeriods(db, schoolYearId).length + 1;

  createPeriod(db, { schoolYearId, label, startTime, endTime, sortOrder: nextSortOrder });

  redirect("/schedule");
}

export async function updatePeriodAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder"));

  if (
    !id ||
    !label ||
    !timePattern(startTime) ||
    !timePattern(endTime) ||
    endTime <= startTime ||
    !Number.isInteger(sortOrder)
  ) {
    redirect("/schedule?error=period");
  }

  updatePeriod(getClassPilotDatabase(), { id, label, startTime, endTime, sortOrder });

  redirect("/schedule");
}

export async function deletePeriodAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("id") ?? "").trim();

  if (id) {
    deletePeriod(getClassPilotDatabase(), id);
  }

  redirect("/schedule");
}

export async function assignScheduleSlotAction(formData: FormData) {
  await requireAuth();

  const classId = String(formData.get("classId") ?? "").trim();
  const periodId = String(formData.get("periodId") ?? "").trim();
  const cycleDay = Number(formData.get("cycleDay"));

  if (!classId || !periodId || !Number.isInteger(cycleDay) || cycleDay < 1) {
    redirect("/schedule?error=slot");
  }

  const result = assignScheduleSlot(getClassPilotDatabase(), { classId, periodId, cycleDay });

  if (result.conflictClassName) {
    redirect(
      `/schedule?day=${cycleDay}&conflictClassId=${encodeURIComponent(classId)}&conflictWith=${encodeURIComponent(result.conflictClassName)}`,
    );
  }

  redirect(`/schedule?day=${cycleDay}`);
}

export async function removeScheduleSlotAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("id") ?? "").trim();
  const cycleDay = String(formData.get("cycleDay") ?? "").trim();

  if (id) {
    removeScheduleSlot(getClassPilotDatabase(), id);
  }

  redirect(`/schedule?day=${cycleDay}`);
}
