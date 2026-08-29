"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import {
  createRosterField,
  deleteRosterField,
  saveRosterFieldValue,
} from "@/src/lib/db/roster-fields-repository";
import { createRosterView, deleteRosterView } from "@/src/lib/db/roster-views-repository";
import {
  setPrimaryContactField,
  updateStudentField,
  type EditablePrimaryContactField,
  type EditableStudentField,
} from "@/src/lib/db/students-repository";

export async function createRosterFieldAction(formData: FormData) {
  const userId = await requireAuth();

  const schoolYearId = String(formData.get("schoolYearId") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!schoolYearId || !label) {
    redirect("/students?error=label");
  }

  createRosterField(getClassPilotDatabase(), userId, { schoolYearId, label });

  redirect("/students?created=1");
}

export async function deleteRosterFieldAction(formData: FormData) {
  const userId = await requireAuth();

  const fieldId = String(formData.get("fieldId") ?? "").trim();

  if (!fieldId) {
    redirect("/students");
  }

  deleteRosterField(getClassPilotDatabase(), userId, fieldId);

  redirect("/students?deleted=1");
}

export async function createRosterViewAction(formData: FormData) {
  const userId = await requireAuth();

  const schoolYearId = String(formData.get("schoolYearId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const columnsRaw = String(formData.get("columns") ?? "[]");

  if (!schoolYearId || !name) {
    redirect("/students?error=viewname");
  }

  let columns: string[] = [];
  try {
    columns = JSON.parse(columnsRaw);
  } catch {
    columns = [];
  }

  createRosterView(getClassPilotDatabase(), userId, { schoolYearId, name, columns });

  redirect("/students?viewSaved=1");
}

export async function deleteRosterViewAction(formData: FormData) {
  const userId = await requireAuth();

  const viewId = String(formData.get("viewId") ?? "").trim();

  if (!viewId) {
    redirect("/students");
  }

  deleteRosterView(getClassPilotDatabase(), userId, viewId);

  redirect("/students?viewDeleted=1");
}

/**
 * All four of these are called directly from the grid's client component on
 * cell blur (not through a <form>) -- no redirect/revalidate on purpose, so
 * saving one cell never re-renders the page and disrupts a teacher tabbing
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

export async function saveStudentFieldAction(
  studentId: string,
  field: EditableStudentField,
  value: string,
) {
  const userId = await requireAuth();

  updateStudentField(getClassPilotDatabase(), userId, studentId, field, value);
}

export async function saveContactFieldAction(
  studentId: string,
  field: EditablePrimaryContactField,
  value: string,
) {
  const userId = await requireAuth();

  setPrimaryContactField(getClassPilotDatabase(), userId, studentId, field, value);
}
