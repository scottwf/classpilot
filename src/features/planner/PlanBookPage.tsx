import { buildDayAgenda } from "./day-agenda";
import { DailyPlanner } from "./DailyPlanner";
import {
  getLessonsForDate,
  getLessonsForWeek,
  getWeekdayDates,
} from "./lesson-queries";
import { PlanBookNav } from "./PlanBookNav";
import type { PlannerData, ScheduleSlot } from "./types";
import { UpcomingBirthdaysCard } from "./UpcomingBirthdaysCard";
import { ViewSwitcher } from "./ViewSwitcher";
import type { UpcomingBirthday } from "@/src/features/students/birthdays";

type PlanBookPageProps = {
  data: PlannerData;
  scheduleSlots: ScheduleSlot[];
  selectedDate: string;
  todayDate: string;
  upcomingBirthdays?: UpcomingBirthday[];
  view: "day" | "week";
};

export function PlanBookPage({
  data,
  scheduleSlots,
  selectedDate,
  todayDate,
  upcomingBirthdays = [],
  view,
}: PlanBookPageProps) {
  const dates = view === "week" ? getWeekdayDates(selectedDate) : [selectedDate];
  const lessonsInRange =
    view === "week" ? getLessonsForWeek(data, selectedDate) : getLessonsForDate(data, selectedDate);

  const days = dates.map((date) => ({
    date,
    entries: buildDayAgenda(
      date,
      data.schoolYear,
      scheduleSlots,
      data.classes,
      lessonsInRange.filter((lesson) => lesson.date === date),
    ),
  }));

  const scheduledLessonIds = new Set(
    days.flatMap((day) => day.entries.flatMap((entry) => (entry.lesson ? [entry.lesson.id] : []))),
  );
  const otherLessons = lessonsInRange.filter((lesson) => !scheduledLessonIds.has(lesson.id));

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <section>
          <p className="text-sm font-medium text-blue-700">Plan book</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Start with the lessons you need to teach.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Day and week views show your actual timetable — click a
            scheduled class to add or open its lesson. Lessons, units, and
            outcomes each have their own pages so this screen stays focused.
          </p>
        </section>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <ViewSwitcher date={selectedDate} view={view} />
          <PlanBookNav date={selectedDate} todayDate={todayDate} view={view} />
        </div>
      </div>

      <UpcomingBirthdaysCard birthdays={upcomingBirthdays} />

      <DailyPlanner date={selectedDate} days={days} otherLessons={otherLessons} view={view} />
    </>
  );
}
