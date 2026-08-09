"use server";

import { redirect } from "next/navigation";
import type { UnitPlan } from "@/src/features/planner/types";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { createUnit } from "@/src/lib/db/planner-repository";

const colors = new Set(["blue", "emerald", "amber", "rose", "violet"]);

export async function createUnitAction(formData: FormData) {
  await requireAuth();

  const title = requiredString(formData, "title");
  const classId = requiredString(formData, "classId");
  const startDate = requiredString(formData, "startDate");
  const endDate = requiredString(formData, "endDate");
  const color = requiredString(formData, "color");
  const outcomeIds = formData.getAll("outcomeIds").map(String);
  const notes = String(formData.get("notes") ?? "").trim();

  if (endDate < startDate || !colors.has(color)) {
    redirect("/units/new?error=dates");
  }

  createUnit(getClassPilotDatabase(), {
    classId,
    color: color as UnitPlan["color"],
    endDate,
    outcomeIds,
    startDate,
    title,
    notes,
  });

  redirect("/units?created=1");
}

function requiredString(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    redirect(`/units/new?error=${key}`);
  }

  return value;
}
