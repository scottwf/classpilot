"use server";

import { redirect } from "next/navigation";
import { parseLessonMarkdown } from "@/src/lib/lessons/markdown-import";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { createLesson } from "@/src/lib/db/planner-repository";

export async function importLessonMarkdownAction(formData: FormData) {
  const userId = await requireAuth();

  const markdown = await getMarkdown(formData);
  const parsed = parseLessonMarkdown(markdown);
  const plannerData = getClassPilotPlannerData(userId);
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

  createLesson(getClassPilotDatabase(), userId, {
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

/**
 * Unit-scoped batch import (issue #32) -- the unit is already known from
 * the page this is submitted from, so unlike importLessonMarkdownAction
 * each file's `Unit:` metadata line is parsed (the format still requires
 * it) but never used for resolution; every lesson is attached to the
 * caller-supplied unitId directly. Per-file failures don't abort the
 * batch -- a teacher fixing one bad file shouldn't have to re-import
 * everything else.
 */
export async function importLessonMarkdownBatchAction(formData: FormData) {
  const userId = await requireAuth();
  const unitId = String(formData.get("unitId") ?? "");
  const plannerData = getClassPilotPlannerData(userId);
  const unit = plannerData.units.find((candidate) => candidate.id === unitId);

  if (!unit) {
    redirect("/units");
  }

  const files = formData
    .getAll("lessonFiles")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    redirect(`/units/${unitId}?importError=empty`);
  }

  const db = getClassPilotDatabase();
  let imported = 0;
  const failed: string[] = [];

  for (const file of files) {
    try {
      const markdown = await file.text();
      const parsed = parseLessonMarkdown(markdown);

      const outcomeIds = parsed.outcomeRefs.map((ref) => {
        const outcome = plannerData.outcomes.find((candidate) =>
          matchesReference(candidate.id, candidate.code, ref),
        );

        if (!outcome) {
          throw new Error(`No curriculum outcome matches "${ref}".`);
        }

        return outcome.id;
      });

      createLesson(db, userId, {
        date: parsed.date,
        durationMinutes: parsed.durationMinutes,
        outcomeIds,
        sections: parsed.sections,
        status: parsed.status,
        summary: parsed.summary,
        title: parsed.title,
        unitId,
      });
      imported += 1;
    } catch {
      failed.push(file.name);
    }
  }

  const params = new URLSearchParams({ imported: String(imported) });

  if (failed.length > 0) {
    params.set("importFailed", failed.join(", "));
  }

  redirect(`/units/${unitId}?${params.toString()}`);
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
