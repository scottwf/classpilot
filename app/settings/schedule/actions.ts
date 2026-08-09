"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import {
  addTemporaryScheduleSlot,
  deleteScheduleSlot,
  setClassSchedule,
  type ClassScheduleSlotInput,
} from "@/src/lib/db/schedule-repository";

const timePattern = /^\d{2}:\d{2}$/;

// The ClassScheduleEditor builds this client-side and hands it over as
// JSON — re-validate the shape rather than trusting form data.
function parseSlotsJson(raw: string): ClassScheduleSlotInput[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((entry): entry is ClassScheduleSlotInput => {
    return (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as ClassScheduleSlotInput).cycleDay === "number" &&
      Number.isInteger((entry as ClassScheduleSlotInput).cycleDay) &&
      (entry as ClassScheduleSlotInput).cycleDay > 0 &&
      typeof (entry as ClassScheduleSlotInput).startTime === "string" &&
      timePattern.test((entry as ClassScheduleSlotInput).startTime) &&
      typeof (entry as ClassScheduleSlotInput).endTime === "string" &&
      timePattern.test((entry as ClassScheduleSlotInput).endTime) &&
      (entry as ClassScheduleSlotInput).endTime > (entry as ClassScheduleSlotInput).startTime
    );
  });
}

export async function setClassScheduleAction(formData: FormData) {
  await requireAuth();

  const classId = String(formData.get("classId") ?? "").trim();
  const suffix = formData.get("wizard") === "1" ? "&wizard=1" : "";

  if (!classId) {
    redirect(`/settings/schedule?error=missing${suffix}`);
  }

  const slots = parseSlotsJson(String(formData.get("slotsJson") ?? "[]"));
  const conflicts = setClassSchedule(getClassPilotDatabase(), classId, slots);

  if (conflicts.length > 0) {
    redirect(
      `/settings/schedule?conflictClassId=${encodeURIComponent(classId)}&conflictClassName=${encodeURIComponent(conflicts[0].className)}${suffix}`,
    );
  }

  redirect(suffix ? "/settings/schedule?wizard=1" : "/settings/schedule");
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function addTemporaryScheduleSlotAction(formData: FormData) {
  await requireAuth();

  const classId = String(formData.get("classId") ?? "").trim();
  const cycleDay = Number(formData.get("cycleDay"));
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();

  if (
    !classId ||
    !Number.isInteger(cycleDay) ||
    cycleDay < 1 ||
    !timePattern.test(startTime) ||
    !timePattern.test(endTime) ||
    endTime <= startTime ||
    !datePattern.test(startDate) ||
    !datePattern.test(endDate) ||
    endDate < startDate
  ) {
    redirect("/settings/schedule?error=temporary");
  }

  const notices = addTemporaryScheduleSlot(getClassPilotDatabase(), classId, {
    cycleDay,
    startTime,
    endTime,
    startDate,
    endDate,
  });

  if (notices.length === 0) {
    redirect("/settings/schedule?temporaryAdded=1");
  }

  const summary = notices
    .map((notice) => {
      const shiftedTotal = notice.shiftedUnits.reduce(
        (total, unit) => total + unit.shiftedLessonCount,
        0,
      );
      const unitNames = notice.shiftedUnits.map((unit) => unit.unitTitle).join(", ");

      return shiftedTotal > 0
        ? `${notice.displacedClassName}: ${notice.displacedOccurrences} session(s) reclaimed, ${shiftedTotal} lesson(s) pushed forward in ${unitNames}.`
        : `${notice.displacedClassName}: ${notice.displacedOccurrences} session(s) reclaimed (no lessons were planned there yet).`;
    })
    .join(" ");

  redirect(`/settings/schedule?swapNotice=${encodeURIComponent(summary)}`);
}

export async function deleteTemporaryScheduleSlotAction(formData: FormData) {
  await requireAuth();

  const slotId = String(formData.get("slotId") ?? "").trim();

  if (slotId) {
    deleteScheduleSlot(getClassPilotDatabase(), slotId);
  }

  redirect("/settings/schedule");
}
