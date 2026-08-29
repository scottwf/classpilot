import { CalendarDays } from "lucide-react";
import { AppShell } from "@/src/features/planner/AppShell";
import { LessonForm } from "@/src/features/planner/LessonForm";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import { isAiConfigured } from "@/src/lib/ai/config";
import { createLessonAction, insertLessonAction } from "./actions";

type NewLessonPageProps = {
  searchParams: Promise<{
    classId?: string;
    date?: string;
    error?: string;
    unitId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NewLessonPage({
  searchParams,
}: NewLessonPageProps) {
  const userId = await requireAuth();

  const plannerData = getClassPilotPlannerData(userId);
  const settings = getAppSettings(getClassPilotDatabase());
  const params = await searchParams;

  // Filling a specific schedule slot (came from the plan book's "+ Add
  // lesson") — offer inserting an existing lesson from the bank here as an
  // alternative to creating a new one; insertLessonAction cascade-shifts
  // whatever's already on that date instead of overwriting it.
  const activeUnit = params.unitId
    ? plannerData.units.find((unit) => unit.id === params.unitId)
    : undefined;
  const classUnitIds = params.classId
    ? new Set(plannerData.units.filter((unit) => unit.classId === params.classId).map((unit) => unit.id))
    : new Set<string>();
  // Scoped to the slot's active unit when known (the common case now that
  // the plan book resolves it) so the list is ordered by that unit's real
  // sequence -- falls back to every unit in the class for entry points
  // that don't have a unit yet (e.g. UnitDetailPage's unitId-only links
  // with no date, which won't reach this branch, or a slot outside any
  // unit's date range).
  const insertCandidateUnits = activeUnit
    ? [activeUnit]
    : plannerData.units.filter((unit) => classUnitIds.has(unit.id));
  const existingLessonsForClass = insertCandidateUnits
    .flatMap((unit) =>
      unit.lessons.map((lesson) => ({
        ...lesson,
        unitId: unit.id,
        unitLessonCount: unit.lessons.length,
        unitTitle: unit.title,
      })),
    )
    .sort((a, b) => a.sequence - b.sequence);

  return (
    <AppShell activePage="lessons" data={plannerData}>
      <section>
        <p className="text-sm font-medium text-blue-700">New lesson</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Add a lesson to the plan book.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Connect this lesson to a unit and any outcomes you want to track.
        </p>
      </section>

      {params.classId && params.date && existingLessonsForClass.length > 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">
            Insert an existing lesson
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {activeUnit
              ? `Pick a lesson from ${activeUnit.title}, in order, to place on ${params.date} instead of creating a new one.`
              : `Pick a lesson from this class's bank to place on ${params.date} instead of creating a new one.`}{" "}
            If another lesson is already on that date, it (and everything
            after it) shifts forward a day to make room. Title, sections, and
            outcomes come with it.
          </p>
          <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
            {existingLessonsForClass.map((lesson) => (
              <li
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm"
                key={lesson.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-950">{lesson.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
                    <span>
                      Lesson {lesson.sequence} of {lesson.unitLessonCount}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className={lesson.date ? undefined : "font-medium text-emerald-700"}>
                      {lesson.date ? `Scheduled ${lesson.date}` : "Not yet scheduled"}
                    </span>
                    {activeUnit ? null : (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{lesson.unitTitle}</span>
                      </>
                    )}
                  </p>
                </div>
                <form action={insertLessonAction}>
                  <input name="lessonId" type="hidden" value={lesson.id} />
                  <input name="unitId" type="hidden" value={lesson.unitId} />
                  <input name="date" type="hidden" value={params.date} />
                  <button
                    className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    type="submit"
                  >
                    Insert here
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <LessonForm
        action={createLessonAction}
        aiConfigured={isAiConfigured({
          apiKey: settings.aiApiKey,
          baseUrl: settings.aiBaseUrl,
          model: settings.aiModel,
        })}
        classes={plannerData.classes}
        error={params.error}
        initialClassId={params.classId}
        initialDate={params.date}
        initialUnitId={params.unitId}
        mode="create"
        outcomes={plannerData.outcomes}
        units={plannerData.units}
      />
    </AppShell>
  );
}
