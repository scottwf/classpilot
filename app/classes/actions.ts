"use server";

import { redirect } from "next/navigation";
import type { ClassColor } from "@/src/features/planner/types";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import {
  createClass,
  deleteClass,
  getActiveSchoolYearId,
  updateClass,
} from "@/src/lib/db/planner-repository";

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

export async function createClassAction(formData: FormData) {
  await requireAuth();

  const db = getClassPilotDatabase();
  const input = readClassInput(formData);

  if (!input) {
    redirect("/classes/new?error=missing");
  }

  createClass(db, { ...input, schoolYearId: getActiveSchoolYearId(db) });

  redirect("/classes?created=1");
}

export async function updateClassAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("id") ?? "").trim();
  // Preserves the class's existing year — the edit form carries this as a
  // hidden field rather than exposing a year switcher (see ClassForm.tsx).
  const schoolYearId = String(formData.get("schoolYearId") ?? "").trim();
  const input = readClassInput(formData);

  if (!id || !schoolYearId || !input) {
    redirect(id ? `/classes/${id}/edit?error=missing` : "/classes?error=missing");
  }

  updateClass(getClassPilotDatabase(), { ...input, id, schoolYearId });

  redirect("/classes?updated=1");
}

export async function deleteClassAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("id") ?? "").trim();

  if (id) {
    deleteClass(getClassPilotDatabase(), id);
  }

  redirect("/classes?deleted=1");
}

function readClassInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const room = String(formData.get("room") ?? "").trim();
  const meetingPattern = String(formData.get("meetingPattern") ?? "").trim();
  const cycleDays = formData
    .getAll("cycleDays")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  const targetMinutesRaw = String(formData.get("targetMinutesPerYear") ?? "").trim();
  const targetMinutesPerYear =
    targetMinutesRaw && Number.isInteger(Number(targetMinutesRaw)) && Number(targetMinutesRaw) > 0
      ? Number(targetMinutesRaw)
      : undefined;
  const colorRaw = String(formData.get("color") ?? "").trim();
  const color = classColors.includes(colorRaw as ClassColor)
    ? (colorRaw as ClassColor)
    : "blue";

  const isInstructional = formData.get("isInstructional") !== null;
  let subject: string;
  let grade: string;

  if (isInstructional) {
    const [choiceGrade, choiceSubject] = String(formData.get("curriculumChoice") ?? "")
      .split("|")
      .map((part) => part.trim());

    if (!choiceGrade || !choiceSubject) {
      return undefined;
    }

    grade = choiceGrade;
    subject = choiceSubject;
  } else {
    subject = String(formData.get("subjectFreeText") ?? "").trim();
    grade = String(formData.get("gradeFreeText") ?? "").trim();
  }

  if (!name) {
    return undefined;
  }

  return {
    name,
    subject,
    grade,
    room,
    meetingPattern,
    cycleDays,
    targetMinutesPerYear,
    color,
    isInstructional,
  };
}
