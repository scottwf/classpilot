"use server";

import { redirect } from "next/navigation";
import type { ClassColor } from "@/src/features/planner/types";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import {
  createClass,
  createSchoolYear,
  deleteClass,
  getActiveSchoolYearId,
  setActiveSchoolYear,
} from "@/src/lib/db/planner-repository";

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

const classColors: ClassColor[] = [
  "blue",
  "emerald",
  "amber",
  "rose",
  "violet",
  "sky",
  "orange",
  "teal",
];

export async function createOnboardingYearAction(formData: FormData) {
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
    redirect("/onboarding?error=details");
  }

  const db = getClassPilotDatabase();
  const yearId = createSchoolYear(db, { title, startDate, endDate, cycleLength });
  // The rest of the app (classes, schedule, calendar) always operates on
  // whichever year is "active" — the new year becomes it immediately so the
  // remaining wizard steps (and the existing /schedule page they hand off
  // to) work on it without any extra plumbing.
  setActiveSchoolYear(db, yearId);

  redirect("/onboarding/classes");
}

export async function addOnboardingClassAction(formData: FormData) {
  await requireAuth();

  const db = getClassPilotDatabase();
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const colorRaw = String(formData.get("color") ?? "").trim();
  const color = classColors.includes(colorRaw as ClassColor) ? (colorRaw as ClassColor) : "blue";
  const targetMinutesRaw = String(formData.get("targetMinutesPerYear") ?? "").trim();
  const targetMinutesPerYear =
    targetMinutesRaw && Number.isInteger(Number(targetMinutesRaw)) && Number(targetMinutesRaw) > 0
      ? Number(targetMinutesRaw)
      : undefined;

  if (!name || !subject || !grade) {
    redirect("/onboarding/classes?error=missing");
  }

  createClass(db, {
    schoolYearId: getActiveSchoolYearId(db),
    name,
    subject,
    grade,
    room: "",
    meetingPattern: "",
    cycleDays: [],
    color,
    targetMinutesPerYear,
  });

  redirect("/onboarding/classes");
}

export async function removeOnboardingClassAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("id") ?? "").trim();

  if (id) {
    deleteClass(getClassPilotDatabase(), id);
  }

  redirect("/onboarding/classes");
}
