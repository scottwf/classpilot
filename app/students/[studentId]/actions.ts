"use server";

import { redirect } from "next/navigation";
import type {
  FollowUpStatus,
  NoteCategory,
  ReminderCategory,
  ReminderStatus,
  SupportPlanType,
} from "@/src/features/students/types";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import {
  createContact,
  createNote,
  createReminder,
  createSupportPlan,
  deleteContact,
  deleteNote,
  deleteReminder,
  deleteStudent,
  deleteSupportPlan,
  setNoteFollowUpStatus,
  setReminderStatus,
} from "@/src/lib/db/students-repository";

const noteCategories = new Set<NoteCategory>([
  "academic",
  "behavior",
  "attendance",
  "social_emotional",
  "family",
  "medical",
  "other",
]);

const followUpStatuses = new Set<FollowUpStatus>([
  "none",
  "open",
  "in_progress",
  "resolved",
]);

const supportPlanTypes = new Set<SupportPlanType>([
  "accommodation",
  "intervention",
  "iep",
  "health",
  "behavior",
]);

const reminderCategories = new Set<ReminderCategory>([
  "follow_up",
  "missing_work",
  "parent_contact",
  "support",
  "other",
]);

const reminderStatuses = new Set<ReminderStatus>(["open", "done", "dismissed"]);

function required(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    redirect("/students");
  }

  return value;
}

export async function addContactAction(formData: FormData) {
  const userId = await requireAuth();
  const studentId = required(formData, "studentId");
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect(`/students/${studentId}?error=contact`);
  }

  createContact(getClassPilotDatabase(), userId, {
    studentId,
    name,
    relationship: String(formData.get("relationship") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    isPrimary: formData.get("isPrimary") === "on",
    isEmergency: formData.get("isEmergency") === "on",
    notes: String(formData.get("notes") ?? "").trim(),
  });

  redirect(`/students/${studentId}`);
}

export async function deleteContactAction(formData: FormData) {
  const userId = await requireAuth();
  const studentId = required(formData, "studentId");
  deleteContact(getClassPilotDatabase(), userId, required(formData, "id"));
  redirect(`/students/${studentId}`);
}

export async function addNoteAction(formData: FormData) {
  const userId = await requireAuth();
  const studentId = required(formData, "studentId");
  const body = String(formData.get("body") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const followUpStatus = String(formData.get("followUpStatus") ?? "none");

  if (!body || !noteCategories.has(category as NoteCategory)) {
    redirect(`/students/${studentId}?error=note`);
  }

  createNote(getClassPilotDatabase(), userId, {
    studentId,
    date: String(formData.get("date") ?? "").trim() || todayKey(),
    category: category as NoteCategory,
    subject: String(formData.get("subject") ?? "").trim(),
    body,
    followUpStatus: followUpStatuses.has(followUpStatus as FollowUpStatus)
      ? (followUpStatus as FollowUpStatus)
      : "none",
  });

  redirect(`/students/${studentId}`);
}

export async function setNoteFollowUpAction(formData: FormData) {
  const userId = await requireAuth();
  const studentId = required(formData, "studentId");
  const status = String(formData.get("followUpStatus") ?? "none");

  if (followUpStatuses.has(status as FollowUpStatus)) {
    setNoteFollowUpStatus(
      getClassPilotDatabase(),
      userId,
      required(formData, "id"),
      status as FollowUpStatus,
    );
  }

  redirect(`/students/${studentId}`);
}

export async function deleteNoteAction(formData: FormData) {
  const userId = await requireAuth();
  const studentId = required(formData, "studentId");
  deleteNote(getClassPilotDatabase(), userId, required(formData, "id"));
  redirect(`/students/${studentId}`);
}

export async function addSupportPlanAction(formData: FormData) {
  const userId = await requireAuth();
  const studentId = required(formData, "studentId");
  const title = String(formData.get("title") ?? "").trim();
  const planType = String(formData.get("planType") ?? "");

  if (!title || !supportPlanTypes.has(planType as SupportPlanType)) {
    redirect(`/students/${studentId}?error=support`);
  }

  createSupportPlan(getClassPilotDatabase(), userId, {
    studentId,
    planType: planType as SupportPlanType,
    title,
    details: String(formData.get("details") ?? "").trim(),
    strategies: String(formData.get("strategies") ?? "").trim(),
    startDate: String(formData.get("startDate") ?? "").trim(),
    reviewDate: String(formData.get("reviewDate") ?? "").trim(),
  });

  redirect(`/students/${studentId}`);
}

export async function deleteSupportPlanAction(formData: FormData) {
  const userId = await requireAuth();
  const studentId = required(formData, "studentId");
  deleteSupportPlan(getClassPilotDatabase(), userId, required(formData, "id"));
  redirect(`/students/${studentId}`);
}

export async function addReminderAction(formData: FormData) {
  const userId = await requireAuth();
  const studentId = required(formData, "studentId");
  const title = String(formData.get("title") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const category = String(formData.get("category") ?? "follow_up");

  if (!title || !dueDate) {
    redirect(`/students/${studentId}?error=reminder`);
  }

  createReminder(getClassPilotDatabase(), userId, {
    studentId,
    dueDate,
    category: reminderCategories.has(category as ReminderCategory)
      ? (category as ReminderCategory)
      : "follow_up",
    title,
    details: String(formData.get("details") ?? "").trim(),
  });

  redirect(`/students/${studentId}`);
}

export async function setReminderStatusAction(formData: FormData) {
  const userId = await requireAuth();
  const studentId = required(formData, "studentId");
  const status = String(formData.get("status") ?? "");

  if (reminderStatuses.has(status as ReminderStatus)) {
    setReminderStatus(
      getClassPilotDatabase(),
      userId,
      required(formData, "id"),
      status as ReminderStatus,
    );
  }

  redirect(`/students/${studentId}`);
}

export async function deleteReminderAction(formData: FormData) {
  const userId = await requireAuth();
  const studentId = required(formData, "studentId");
  deleteReminder(getClassPilotDatabase(), userId, required(formData, "id"));
  redirect(`/students/${studentId}`);
}

export async function deleteStudentAction(formData: FormData) {
  const userId = await requireAuth();
  deleteStudent(getClassPilotDatabase(), userId, required(formData, "id"));
  redirect("/students");
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
