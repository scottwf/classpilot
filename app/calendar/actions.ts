"use server";

import { redirect } from "next/navigation";
import type { NonInstructionalDay } from "@/src/features/planner/types";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { getSchoolYear, updateSchoolYear } from "@/src/lib/db/planner-repository";

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export async function updateSchoolYearDetailsAction(formData: FormData) {
  await requireAuth();

  const title = String(formData.get("title") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();

  if (
    !title ||
    !dateKeyPattern.test(startDate) ||
    !dateKeyPattern.test(endDate) ||
    endDate < startDate
  ) {
    redirect("/calendar?error=details");
  }

  const current = getSchoolYear(getClassPilotDatabase());

  updateSchoolYear(getClassPilotDatabase(), {
    title,
    startDate,
    endDate,
    blockedDates: current.blockedDates,
  });

  redirect("/calendar");
}

export async function addNonInstructionalDaysAction(formData: FormData) {
  await requireAuth();

  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDateRaw = String(formData.get("endDate") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const endDate = endDateRaw || startDate;

  if (
    !dateKeyPattern.test(startDate) ||
    !dateKeyPattern.test(endDate) ||
    endDate < startDate
  ) {
    redirect("/calendar?error=range");
  }

  const current = getSchoolYear(getClassPilotDatabase());
  const byDate = new Map<string, NonInstructionalDay>(
    current.blockedDates.map((day) => [day.date, day]),
  );

  for (const date of weekdayKeysInRange(startDate, endDate)) {
    byDate.set(date, { date, label });
  }

  updateSchoolYear(getClassPilotDatabase(), {
    title: current.title,
    startDate: current.startDate,
    endDate: current.endDate,
    blockedDates: Array.from(byDate.values()),
  });

  redirect("/calendar");
}

export async function removeNonInstructionalDayAction(formData: FormData) {
  await requireAuth();

  const date = String(formData.get("date") ?? "").trim();

  if (!dateKeyPattern.test(date)) {
    redirect("/calendar?error=date");
  }

  const current = getSchoolYear(getClassPilotDatabase());

  updateSchoolYear(getClassPilotDatabase(), {
    title: current.title,
    startDate: current.startDate,
    endDate: current.endDate,
    blockedDates: current.blockedDates.filter((day) => day.date !== date),
  });

  redirect("/calendar");
}

// Expands an inclusive date range into weekday date keys (weekends are already
// excluded from instructional days, so blocking them adds no value).
function weekdayKeysInRange(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  const end = new Date(`${endKey}T00:00:00.000Z`);

  for (
    let date = new Date(`${startKey}T00:00:00.000Z`);
    date <= end;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const weekday = date.getUTCDay();

    if (weekday !== 0 && weekday !== 6) {
      keys.push(date.toISOString().slice(0, 10));
    }
  }

  return keys;
}
