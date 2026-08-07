"use server";

import { redirect } from "next/navigation";
import type {
  ClassColor,
  DayLabelScheme,
  NonInstructionalDay,
} from "@/src/features/planner/types";
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

const dayLabelSchemes: DayLabelScheme[] = ["numeric", "letters", "odd-even"];
const dateKeyPatternForBlocked = /^\d{4}-\d{2}-\d{2}$/;

// The calendar step builds this client-side and hands it over as JSON —
// re-validate the shape rather than trusting form data.
function parseBlockedDates(raw: string): NonInstructionalDay[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((entry): entry is NonInstructionalDay => {
    return (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as NonInstructionalDay).date === "string" &&
      dateKeyPatternForBlocked.test((entry as NonInstructionalDay).date) &&
      typeof (entry as NonInstructionalDay).label === "string" &&
      typeof (entry as NonInstructionalDay).advancesCycle === "boolean"
    );
  });
}

export async function createOnboardingYearAction(formData: FormData) {
  await requireAuth();

  const title = String(formData.get("title") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const cycleLength = Number(formData.get("cycleLength"));
  const dayLabelSchemeRaw = String(formData.get("dayLabelScheme") ?? "").trim();
  const dayLabelScheme = dayLabelSchemes.includes(dayLabelSchemeRaw as DayLabelScheme)
    ? (dayLabelSchemeRaw as DayLabelScheme)
    : "numeric";
  const blockedDates = parseBlockedDates(String(formData.get("blockedDatesJson") ?? "[]"));

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
  const yearId = createSchoolYear(db, {
    title,
    startDate,
    endDate,
    cycleLength,
    dayLabelScheme,
    blockedDates,
  });
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
  const colorRaw = String(formData.get("color") ?? "").trim();
  const color = classColors.includes(colorRaw as ClassColor) ? (colorRaw as ClassColor) : "blue";
  const targetMinutesRaw = String(formData.get("targetMinutesPerYear") ?? "").trim();
  const targetMinutesPerYear =
    targetMinutesRaw && Number.isInteger(Number(targetMinutesRaw)) && Number(targetMinutesRaw) > 0
      ? Number(targetMinutesRaw)
      : undefined;

  const isInstructional = formData.get("isInstructional") !== null;
  let subject: string;
  let grade: string;

  if (isInstructional) {
    const [choiceGrade, choiceSubject] = String(formData.get("curriculumChoice") ?? "")
      .split("|")
      .map((part) => part.trim());

    if (!choiceGrade || !choiceSubject) {
      redirect("/onboarding/classes?error=missing");
    }

    grade = choiceGrade;
    subject = choiceSubject;
  } else {
    subject = String(formData.get("subjectFreeText") ?? "").trim();
    grade = String(formData.get("gradeFreeText") ?? "").trim();
  }

  if (!name) {
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
    isInstructional,
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
