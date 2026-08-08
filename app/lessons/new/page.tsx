import { CalendarDays } from "lucide-react";
import { AppShell } from "@/src/features/planner/AppShell";
import { LessonForm } from "@/src/features/planner/LessonForm";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import { isAiConfigured } from "@/src/lib/ai/config";
import { createLessonAction, moveLessonToDateAction } from "./actions";

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
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const settings = getAppSettings(getClassPilotDatabase());
  const params = await searchParams;

  // Filling a specific schedule slot (came from the plan book's "+ Add
  // lesson") — offer moving an existing lesson from the bank here as an
  // alternative to creating a new one, per the "move it to this slot" UX
  // decision: the picked lesson's date changes, everything else stays.
  const classUnitIds = params.classId
    ? new Set(plannerData.units.filter((unit) => unit.classId === params.classId).map((unit) => unit.id))
    : new Set<string>();
  const existingLessonsForClass = params.classId
    ? plannerData.units
        .filter((unit) => classUnitIds.has(unit.id))
        .flatMap((unit) =>
          unit.lessons.map((lesson) => ({ ...lesson, unitTitle: unit.title })),
        )
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

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
            Or move an existing lesson here
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Pick a lesson from this class&apos;s bank to move it to{" "}
            {params.date} instead of creating a new one — its title,
            sections, and outcomes come with it.
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
                    {lesson.date} · {lesson.unitTitle}
                  </p>
                </div>
                <form action={moveLessonToDateAction}>
                  <input name="lessonId" type="hidden" value={lesson.id} />
                  <input name="date" type="hidden" value={params.date} />
                  <button
                    className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    type="submit"
                  >
                    Move here
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
