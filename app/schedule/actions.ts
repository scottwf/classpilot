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

// Onboarding wizard forms carry a hidden wizard=1 field so the redirect
// back to /schedule keeps the wizard banner and "Continue to review" link
// showing across every mutation, not just the first page load.
function wizardSuffix(formData: FormData): string {
  return formData.get("wizard") === "1" ? "&wizard=1" : "";
}

export async function createPeriodAction(formData: FormData) {
  await requireAuth();

  const label = String(formData.get("label") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const suffix = wizardSuffix(formData);

  if (!label || !timePattern(startTime) || !timePattern(endTime) || endTime <= startTime) {
    redirect(`/schedule?error=period${suffix}`);
  }

  const db = getClassPilotDatabase();
  const schoolYearId = getActiveSchoolYearId(db);
  const nextSortOrder = getPeriods(db, schoolYearId).length + 1;

  createPeriod(db, { schoolYearId, label, startTime, endTime, sortOrder: nextSortOrder });

  redirect(suffix ? `/schedule?wizard=1` : "/schedule");
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
  const suffix = wizardSuffix(formData);

  if (id) {
    deletePeriod(getClassPilotDatabase(), id);
  }

  redirect(suffix ? `/schedule?wizard=1` : "/schedule");
}

export async function assignScheduleSlotAction(formData: FormData) {
  await requireAuth();

  const classId = String(formData.get("classId") ?? "").trim();
  const periodId = String(formData.get("periodId") ?? "").trim();
  const cycleDay = Number(formData.get("cycleDay"));
  const suffix = wizardSuffix(formData);

  if (!classId || !periodId || !Number.isInteger(cycleDay) || cycleDay < 1) {
    redirect(`/schedule?error=slot${suffix}`);
  }

  const result = assignScheduleSlot(getClassPilotDatabase(), { classId, periodId, cycleDay });

  if (result.conflictClassName) {
    redirect(
      `/schedule?day=${cycleDay}&conflictClassId=${encodeURIComponent(classId)}&conflictWith=${encodeURIComponent(result.conflictClassName)}${suffix}`,
    );
  }

  redirect(`/schedule?day=${cycleDay}${suffix}`);
}

export async function removeScheduleSlotAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("id") ?? "").trim();
  const cycleDay = String(formData.get("cycleDay") ?? "").trim();
  const suffix = wizardSuffix(formData);

  if (id) {
    removeScheduleSlot(getClassPilotDatabase(), id);
  }

  redirect(`/schedule?day=${cycleDay}${suffix}`);
}
