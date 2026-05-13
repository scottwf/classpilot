"use server";

import { redirect } from "next/navigation";
import { parseLessonMarkdown } from "@/src/lib/lessons/markdown-import";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { createLesson } from "@/src/lib/db/planner-repository";

export async function importLessonMarkdownAction(formData: FormData) {
  await requireAuth();

  const markdown = await getMarkdown(formData);
  const parsed = parseLessonMarkdown(markdown);
  const plannerData = getClassPilotPlannerData();
  const unit = plannerData.units.find((candidate) =>
    matchesReference(candidate.id, candidate.title, parsed.unitRef),
  );

  if (!unit) {
    redirect("/lessons/import?error=unit");
  }

  const outcomeIds = parsed.outcomeRefs.map((ref) => {
    const outcome = plannerData.outcomes.find((candidate) =>
      matchesReference(candidate.id, candidate.code, ref),
    );
    return outcome?.id;
  });

  if (outcomeIds.some((id) => !id)) {
    redirect("/lessons/import?error=outcome");
  }

  createLesson(getClassPilotDatabase(), {
    date: parsed.date,
    durationMinutes: parsed.durationMinutes,
    outcomeIds: outcomeIds as string[],
    sections: parsed.sections,
    status: parsed.status,
    summary: parsed.summary,
    title: parsed.title,
    unitId: unit.id,
  });

  redirect("/lessons?imported=1");
}

async function getMarkdown(formData: FormData) {
  const file = formData.get("lessonFile");

  if (file instanceof File && file.size > 0) {
    return file.text();
  }

  const pastedMarkdown = String(formData.get("lessonMarkdown") ?? "").trim();

  if (!pastedMarkdown) {
    redirect("/lessons/import?error=empty");
  }

  return pastedMarkdown;
}

function matchesReference(id: string, label: string, reference: string) {
  const normalizedReference = normalize(reference);
  return normalize(id) === normalizedReference || normalize(label) === normalizedReference;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
