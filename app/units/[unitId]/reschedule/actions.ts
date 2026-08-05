"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { cascadeRescheduleUnitLessons } from "@/src/lib/db/planner-repository";

export async function cascadeRescheduleAction(formData: FormData) {
  await requireAuth();

  const unitId = requiredString(formData, "unitId");
  const fromDate = requiredString(formData, "fromDate");
  const shiftByDays = Number(formData.get("shiftByDays"));

  if (!Number.isInteger(shiftByDays) || shiftByDays === 0) {
    redirect(`/units/${unitId}?error=shift`);
  }

  const result = cascadeRescheduleUnitLessons(getClassPilotDatabase(), {
    unitId,
    fromDate,
    shiftByDays,
  });

  redirect(`/units/${unitId}?rescheduled=${result.shiftedLessonIds.length}`);
}

function requiredString(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    const unitId = String(formData.get("unitId") ?? "").trim();
    redirect(unitId ? `/units/${unitId}?error=${key}` : "/units?error=missing");
  }

  return value;
}
