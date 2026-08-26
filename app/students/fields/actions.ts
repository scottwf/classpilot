"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import {
  createRosterField,
  deleteRosterField,
  saveRosterFieldValue,
} from "@/src/lib/db/roster-fields-repository";

export async function createRosterFieldAction(formData: FormData) {
  const userId = await requireAuth();

  const schoolYearId = String(formData.get("schoolYearId") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!schoolYearId || !label) {
    redirect("/students/fields?error=label");
  }

  createRosterField(getClassPilotDatabase(), userId, { schoolYearId, label });

  redirect("/students/fields?created=1");
}

export async function deleteRosterFieldAction(formData: FormData) {
  const userId = await requireAuth();

  const fieldId = String(formData.get("fieldId") ?? "").trim();

  if (!fieldId) {
    redirect("/students/fields");
  }

  deleteRosterField(getClassPilotDatabase(), userId, fieldId);

  redirect("/students/fields?deleted=1");
}

/**
 * Called directly from the grid's client component on cell blur (not
 * through a <form>) -- no redirect/revalidate here on purpose, so saving
 * one cell never re-renders the page and disrupts a teacher tabbing
 * through the rest of the grid.
 */
export async function saveRosterFieldValueAction(
  fieldId: string,
  studentId: string,
  value: string,
) {
  const userId = await requireAuth();

  saveRosterFieldValue(getClassPilotDatabase(), userId, { fieldId, studentId, value });
}
