"use server";

import { redirect } from "next/navigation";
import type { StudentStatus } from "@/src/features/students/types";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { updateStudent } from "@/src/lib/db/students-repository";

const statuses = new Set<StudentStatus>(["active", "inactive", "transferred"]);

export async function updateStudentAction(formData: FormData) {
  const userId = await requireAuth();

  const id = String(formData.get("id") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();

  if (!id) {
    redirect("/students");
  }

  if (!firstName || !lastName) {
    redirect(`/students/${id}/edit?error=name`);
  }

  const status = String(formData.get("status") ?? "active");

  updateStudent(getClassPilotDatabase(), userId, {
    id,
    firstName,
    lastName,
    preferredName: String(formData.get("preferredName") ?? "").trim(),
    pronouns: String(formData.get("pronouns") ?? "").trim(),
    birthdate: String(formData.get("birthdate") ?? "").trim(),
    studentNumber: String(formData.get("studentNumber") ?? "").trim(),
    interests: String(formData.get("interests") ?? "").trim(),
    strengths: String(formData.get("strengths") ?? "").trim(),
    status: statuses.has(status as StudentStatus)
      ? (status as StudentStatus)
      : "active",
  });

  redirect(`/students/${id}`);
}
