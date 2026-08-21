"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { updateUnit } from "@/src/lib/db/planner-repository";

export async function updateUnitAction(formData: FormData) {
  const userId = await requireAuth();

  const id = requiredString(formData, "id");
  const title = requiredString(formData, "title");
  const classId = requiredString(formData, "classId");
  const startDate = requiredString(formData, "startDate");
  const endDate = requiredString(formData, "endDate");
  const outcomeIds = formData.getAll("outcomeIds").map(String);
  const notes = String(formData.get("notes") ?? "").trim();

  if (endDate < startDate) {
    redirect(`/units/${id}/edit?error=dates`);
  }

  updateUnit(getClassPilotDatabase(), userId, {
    classId,
    endDate,
    id,
    outcomeIds,
    startDate,
    title,
    notes,
  });

  redirect("/units?updated=1");
}

function requiredString(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    redirect("/units?error=missing");
  }

  return value;
}
