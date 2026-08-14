"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { createUnit } from "@/src/lib/db/planner-repository";

export async function createUnitAction(formData: FormData) {
  const userId = await requireAuth();

  const title = requiredString(formData, "title");
  const classId = requiredString(formData, "classId");
  const startDate = requiredString(formData, "startDate");
  const endDate = requiredString(formData, "endDate");
  const outcomeIds = formData.getAll("outcomeIds").map(String);
  const notes = String(formData.get("notes") ?? "").trim();

  if (endDate < startDate) {
    redirect("/units/new?error=dates");
  }

  createUnit(getClassPilotDatabase(), userId, {
    classId,
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
