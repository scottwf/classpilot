"use server";

import { redirect } from "next/navigation";
import type { UnitPlan } from "@/src/features/planner/types";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { updateUnit } from "@/src/lib/db/planner-repository";

const colors = new Set(["blue", "emerald", "amber", "rose", "violet"]);

export async function updateUnitAction(formData: FormData) {
  await requireAuth();

  const id = requiredString(formData, "id");
  const title = requiredString(formData, "title");
  const classId = requiredString(formData, "classId");
  const startDate = requiredString(formData, "startDate");
  const endDate = requiredString(formData, "endDate");
  const color = requiredString(formData, "color");
  const outcomeIds = formData.getAll("outcomeIds").map(String);
  const notes = String(formData.get("notes") ?? "").trim();

  if (endDate < startDate || !colors.has(color)) {
    redirect(`/units/${id}/edit?error=dates`);
  }

  updateUnit(getClassPilotDatabase(), {
    classId,
    color: color as UnitPlan["color"],
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
