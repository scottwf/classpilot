import Link from "next/link";
import { CalendarDays, Clock3, Pencil, Upload } from "lucide-react";
import type { CurriculumOutcome, PlannerData, UnitPlan } from "./types";

type UnitDetailPageProps = {
  data: PlannerData;
  error?: string;
  rescheduleAction: (formData: FormData) => void | Promise<void>;
  rescheduled?: string;
  unit: UnitPlan;
};

export function UnitDetailPage({
  data,
  error,
  rescheduleAction,
  rescheduled,
  unit,
}: UnitDetailPageProps) {
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

      {rescheduled !== undefined && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {rescheduled === "0"
            ? "No lessons needed to move."
            : `Shifted ${rescheduled} lesson${rescheduled === "1" ? "" : "s"}.`}
        </div>
      )}
      {error === "shift" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Enter a non-zero whole number of instructional days to shift by.
        </div>
      )}

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

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">
              Shift lessons
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Moved a lesson or missed a day? Push every lesson on or after a
              date forward (or pull them back) by a number of instructional
              days — nothing before that date changes.
            </p>
            <form action={rescheduleAction} className="mt-3 space-y-3">
              <input name="unitId" type="hidden" value={unit.id} />
              <label className="block text-sm font-medium text-slate-700">
                On or after
                <input
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                  name="fromDate"
                  required
                  type="date"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Shift by (instructional days)
                <input
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                  name="shiftByDays"
                  placeholder="e.g. 1, or -1 to pull earlier"
                  required
                  step="1"
                  type="number"
                />
              </label>
              <button
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                type="submit"
              >
                Shift lessons
              </button>
            </form>
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
