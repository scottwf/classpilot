"use server";

import { redirect } from "next/navigation";
import type { NonInstructionalDay } from "@/src/features/planner/types";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import {
  deleteSchoolYear,
  getSchoolYear,
  setActiveSchoolYear,
  updateSchoolYear,
} from "@/src/lib/db/planner-repository";

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export async function switchSchoolYearAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/calendar?error=year");
  }

  setActiveSchoolYear(getClassPilotDatabase(), id);

  redirect("/calendar");
}

export async function deleteSchoolYearAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/calendar?error=year");
  }

  try {
    deleteSchoolYear(getClassPilotDatabase(), id);
  } catch {
    redirect("/calendar?error=delete-active-year");
  }

  redirect("/calendar");
}

export async function updateSchoolYearDetailsAction(formData: FormData) {
  await requireAuth();

  const title = String(formData.get("title") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const cycleLength = Number(formData.get("cycleLength"));

  if (
    !title ||
    !dateKeyPattern.test(startDate) ||
    !dateKeyPattern.test(endDate) ||
    endDate < startDate ||
    !Number.isInteger(cycleLength) ||
    cycleLength < 1
  ) {
    redirect("/calendar?error=details");
  }

  const current = getSchoolYear(getClassPilotDatabase());

  updateSchoolYear(getClassPilotDatabase(), {
    id: current.id,
    title,
    startDate,
    endDate,
    blockedDates: current.blockedDates,
    cycleLength,
  });

  redirect("/calendar");
}

export async function addNonInstructionalDaysAction(formData: FormData) {
  await requireAuth();

  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDateRaw = String(formData.get("endDate") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const endDate = endDateRaw || startDate;
  // Checkboxes are only present in FormData when checked; default the
  // planned-closure flow to "advances the cycle" (matches a division's
  // published cycle calendar, which usually already accounts for its own
  // holidays) unless explicitly unchecked.
  const advancesCycle = formData.get("advancesCycle") !== null;

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
    byDate.set(date, { date, label, advancesCycle });
  }

  updateSchoolYear(getClassPilotDatabase(), {
    id: current.id,
    title: current.title,
    startDate: current.startDate,
    endDate: current.endDate,
    blockedDates: Array.from(byDate.values()),
    cycleLength: current.cycleLength,
  });

  redirect("/calendar");
}

// Quick single-day cancellation (snow day, emergency closure). Deliberately
// separate from addNonInstructionalDaysAction: that flow is for planning a
// year's holidays ahead of time (defaults to advancing the cycle); this one
// is for "school is cancelled today" and always pauses the cycle instead —
// the lesson that would have happened just moves to the next school day.
export async function cancelInstructionalDayAction(formData: FormData) {
  await requireAuth();

  const date = String(formData.get("date") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || "Snow day";

  if (!dateKeyPattern.test(date)) {
    redirect("/calendar?error=date");
  }

  const current = getSchoolYear(getClassPilotDatabase());
  const byDate = new Map<string, NonInstructionalDay>(
    current.blockedDates.map((day) => [day.date, day]),
  );

  byDate.set(date, { date, label, advancesCycle: false });

  updateSchoolYear(getClassPilotDatabase(), {
    id: current.id,
    title: current.title,
    startDate: current.startDate,
    endDate: current.endDate,
    blockedDates: Array.from(byDate.values()),
    cycleLength: current.cycleLength,
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
    id: current.id,
    title: current.title,
    startDate: current.startDate,
    endDate: current.endDate,
    blockedDates: current.blockedDates.filter((day) => day.date !== date),
    cycleLength: current.cycleLength,
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
