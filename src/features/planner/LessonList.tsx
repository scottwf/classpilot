import { Clock3, ClipboardCheck } from "lucide-react";
import type { PlannerData, UnitPlan } from "./types";

type LessonListProps = {
  data: PlannerData;
  selectedUnit: UnitPlan;
};

export function LessonList({ data, selectedUnit }: LessonListProps) {
  const outcomes = selectedUnit.outcomeIds
    .map((outcomeId) => data.outcomes.find((outcome) => outcome.id === outcomeId))
    .filter(Boolean);

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-blue-700">Today</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            {selectedUnit.title}
          </h2>
        </div>
        <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          {selectedUnit.startDate} to {selectedUnit.endDate}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {selectedUnit.lessons.map((lesson) => (
          <article
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            key={lesson.id}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium text-slate-950">{lesson.title}</h3>
              <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-600">
                {lesson.status}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {lesson.summary}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 aria-hidden="true" className="size-3.5" />
                {lesson.durationMinutes} min
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ClipboardCheck aria-hidden="true" className="size-3.5" />
                {lesson.date}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-950">
          Curriculum outcomes
        </h3>
        <div className="mt-3 space-y-2">
          {outcomes.map((outcome) => (
            <div
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
              key={outcome?.id}
            >
              <span className="font-semibold text-slate-950">
                {outcome?.code}
              </span>{" "}
              {outcome?.description}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
