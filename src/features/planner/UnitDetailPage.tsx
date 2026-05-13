import Link from "next/link";
import { CalendarDays, Clock3, Pencil, Upload } from "lucide-react";
import type { CurriculumOutcome, PlannerData, UnitPlan } from "./types";

type UnitDetailPageProps = {
  data: PlannerData;
  unit: UnitPlan;
};

export function UnitDetailPage({ data, unit }: UnitDetailPageProps) {
  const classSection = data.classes.find((candidate) => candidate.id === unit.classId);
  const unitOutcomes = unit.outcomeIds
    .map((outcomeId) => data.outcomes.find((outcome) => outcome.id === outcomeId))
    .filter((outcome): outcome is CurriculumOutcome => Boolean(outcome));
  const lessonOutcomeIds = new Set(unit.lessons.flatMap((lesson) => lesson.outcomeIds));
  const outcomesNeedingLessons = unitOutcomes.filter(
    (outcome) => !lessonOutcomeIds.has(outcome.id),
  );
  const totalLessonMinutes = unit.lessons.reduce(
    (total, lesson) => total + lesson.durationMinutes,
    0,
  );

  return (
    <>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Unit planner</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {unit.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {classSection?.name ?? "Unknown class"} from {unit.startDate} to{" "}
            {unit.endDate}. Use this page to build the lessons and keep outcome
            coverage visible while planning.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            href={`/units/${unit.id}/edit`}
          >
            <Pencil aria-hidden="true" className="size-4" />
            Edit unit details
          </Link>
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            href={`/lessons/import?unitId=${unit.id}`}
          >
            <Upload aria-hidden="true" className="size-4" />
            Import Markdown lesson
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            href={`/lessons/new?unitId=${unit.id}`}
          >
            Add lesson to unit
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Lessons" value={`${unit.lessons.length} lessons`} />
        <Metric
          label="Outcome coverage"
          value={`${unitOutcomes.length} planned outcomes`}
        />
        <Metric
          label="Planning gap"
          value={`${outcomesNeedingLessons.length} outcomes needing lessons`}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-blue-700">Lessons</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">
                Build the unit sequence.
              </h3>
            </div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {totalLessonMinutes} min planned
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {unit.lessons.length > 0 ? (
              unit.lessons.map((lesson) => (
                <article
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  key={lesson.id}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link
                        className="font-medium text-slate-950 hover:text-blue-700"
                        href={`/lessons/${lesson.id}`}
                      >
                        {lesson.title}
                      </Link>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {lesson.summary}
                      </p>
                    </div>
                    <span className="w-fit rounded-md bg-white px-2 py-1 text-xs text-slate-600">
                      {lesson.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      {lesson.date}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 aria-hidden="true" className="size-3.5" />
                      {lesson.durationMinutes} min
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                No lessons have been planned for this unit yet.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">
              Unit outcomes
            </h3>
            <div className="mt-3 space-y-2">
              {unitOutcomes.map((outcome) => {
                const hasLesson = lessonOutcomeIds.has(outcome.id);

                return (
                  <div
                    className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    key={outcome.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-950">
                        {outcome.code}
                      </span>
                      <span
                        className={[
                          "rounded-md px-2 py-1 text-xs font-medium",
                          hasLesson
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700",
                        ].join(" ")}
                      >
                        {hasLesson ? "Lesson planned" : "Needs lesson"}
                      </span>
                    </div>
                    <p className="mt-2 leading-6">{outcome.description}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}
