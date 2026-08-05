"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { createClass, deleteClass, updateClass } from "@/src/lib/db/planner-repository";

export async function createClassAction(formData: FormData) {
  await requireAuth();

  const input = readClassInput(formData);

  if (!input) {
    redirect("/classes/new?error=missing");
  }

  createClass(getClassPilotDatabase(), input);

  redirect("/classes?created=1");
}

export async function updateClassAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("id") ?? "").trim();
  const input = readClassInput(formData);

  if (!id || !input) {
    redirect(id ? `/classes/${id}/edit?error=missing` : "/classes?error=missing");
  }

  updateClass(getClassPilotDatabase(), { ...input, id });

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
  const subject = String(formData.get("subject") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const room = String(formData.get("room") ?? "").trim();
  const meetingPattern = String(formData.get("meetingPattern") ?? "").trim();
  const cycleDays = formData
    .getAll("cycleDays")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (!name || !subject || !grade) {
    return undefined;
  }

  return { name, subject, grade, room, meetingPattern, cycleDays };
}
