import Link from "next/link";
import { CalendarDays, Clock3, Plus } from "lucide-react";
import type { EnrichedLesson } from "./lesson-queries";

type DailyPlannerProps = {
  date: string;
  lessons: EnrichedLesson[];
  view: "day" | "week";
};

export function DailyPlanner({ date, lessons, view }: DailyPlannerProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">
            {view === "day" ? "Today's lessons" : "This week's lessons"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {formatDate(date)}
          </h2>
        </div>
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm"
          href={`/lessons/new?date=${date}`}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add lesson
        </Link>
      </div>

      <div className="mt-4 grid gap-3">
        {lessons.length > 0 ? (
          lessons.map((lesson) => (
            <article
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              key={lesson.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-blue-700">
                    {lesson.className}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950">
                    <Link
                      className="hover:text-blue-700"
                      href={`/lessons/${lesson.id}`}
                    >
                      {lesson.title}
                    </Link>
                  </h3>
                </div>
                <span className="w-fit rounded-md bg-white px-2 py-1 text-xs text-slate-600">
                  {lesson.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {lesson.summary}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays aria-hidden="true" className="size-3.5" />
                  {lesson.date}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 aria-hidden="true" className="size-3.5" />
                  {lesson.durationMinutes} min
                </span>
                <span>{lesson.unitTitle}</span>
                <span>{lesson.outcomeCodes.join(", ")}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            No lessons scheduled for this {view}. Use Add lesson to start
            planning from here.
          </div>
        )}
      </div>
    </section>
  );
}

function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}
