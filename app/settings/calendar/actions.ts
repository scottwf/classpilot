"use server";

import { redirect } from "next/navigation";
import { parseBlockedDatesJson } from "@/src/features/planner/blocked-dates";
import type { DayLabelScheme, NonInstructionalDay } from "@/src/features/planner/types";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { getSchoolYear, updateSchoolYear } from "@/src/lib/db/planner-repository";

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const dayLabelSchemes: DayLabelScheme[] = ["numeric", "letters", "odd-even"];

export async function updateSchoolYearDetailsAction(formData: FormData) {
  await requireAuth();

  const title = String(formData.get("title") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const cycleLength = Number(formData.get("cycleLength"));
  const dayLabelSchemeRaw = String(formData.get("dayLabelScheme") ?? "").trim();
  const dayLabelScheme = dayLabelSchemes.includes(dayLabelSchemeRaw as DayLabelScheme)
    ? (dayLabelSchemeRaw as DayLabelScheme)
    : "numeric";

  if (
    !title ||
    !dateKeyPattern.test(startDate) ||
    !dateKeyPattern.test(endDate) ||
    endDate < startDate ||
    !Number.isInteger(cycleLength) ||
    cycleLength < 1
  ) {
    redirect("/settings/calendar?error=details");
  }

  const current = getSchoolYear(getClassPilotDatabase());

  updateSchoolYear(getClassPilotDatabase(), {
    id: current.id,
    title,
    startDate,
    endDate,
    blockedDates: current.blockedDates,
    cycleLength,
    dayLabelScheme,
  });

  redirect("/settings/calendar");
}

// Bulk-replaces the year's non-instructional days with whatever the
// click-to-mark CalendarGrid built up client-side (see CalendarGrid.tsx) —
// re-validated here rather than trusted, since it arrives as JSON.
export async function updateBlockedDatesAction(formData: FormData) {
  await requireAuth();

  const blockedDates = parseBlockedDatesJson(String(formData.get("blockedDatesJson") ?? "[]"));
  const current = getSchoolYear(getClassPilotDatabase());

  updateSchoolYear(getClassPilotDatabase(), {
    id: current.id,
    title: current.title,
    startDate: current.startDate,
    endDate: current.endDate,
    blockedDates,
    cycleLength: current.cycleLength,
    dayLabelScheme: current.dayLabelScheme,
  });

  redirect("/settings/calendar");
}

// Quick single-day cancellation (snow day, emergency closure). Deliberately
// separate from the calendar grid: this always pauses the cycle instead of
// requiring the advances-cycle toggle to be set correctly — whatever was
// scheduled just moves to the next school day instead of being skipped.
export async function cancelInstructionalDayAction(formData: FormData) {
  await requireAuth();

  const date = String(formData.get("date") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || "Snow day";

  if (!dateKeyPattern.test(date)) {
    redirect("/settings/calendar?error=date");
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
    dayLabelScheme: current.dayLabelScheme,
  });

  redirect("/settings/calendar");
}
