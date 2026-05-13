import { DailyPlanner } from "./DailyPlanner";
import {
  getLessonsForDate,
  getLessonsForWeek,
} from "./lesson-queries";
import type { PlannerData } from "./types";
import { ViewSwitcher } from "./ViewSwitcher";

type PlanBookPageProps = {
  data: PlannerData;
  selectedDate: string;
  view: "day" | "week";
};

export function PlanBookPage({ data, selectedDate, view }: PlanBookPageProps) {
  const visibleLessons =
    view === "week"
      ? getLessonsForWeek(data, selectedDate)
      : getLessonsForDate(data, selectedDate);

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <section>
          <p className="text-sm font-medium text-blue-700">Plan book</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Start with the lessons you need to teach.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Use the day and week views for classroom planning. Lessons, units,
            and outcomes each have their own pages so this screen stays focused.
          </p>
        </section>
        <ViewSwitcher date={selectedDate} view={view} />
      </div>

      <DailyPlanner date={selectedDate} lessons={visibleLessons} view={view} />
    </>
  );
}
