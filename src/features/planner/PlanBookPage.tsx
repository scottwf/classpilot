import { buildDayAgenda } from "./day-agenda";
import { DailyPlanner } from "./DailyPlanner";
import { DashboardStats } from "./DashboardStats";
import {
  getLessonsForDate,
  getLessonsForWeek,
  getWeekdayDates,
} from "./lesson-queries";
import { MiniCalendar } from "./MiniCalendar";
import { PlanBookNav } from "./PlanBookNav";
import { buildInstructionalDays } from "./timeline";
import type { PlannerData, ScheduleSlot } from "./types";
import { UpcomingBirthdaysCard } from "./UpcomingBirthdaysCard";
import { ViewSwitcher } from "./ViewSwitcher";
import type { UpcomingBirthday } from "@/src/features/students/birthdays";

type PlanBookPageProps = {
  calendarMonth?: string;
  data: PlannerData;
  scheduleSlots: ScheduleSlot[];
  selectedDate: string;
  todayDate: string;
  upcomingBirthdays?: UpcomingBirthday[];
  view: "day" | "week";
};

export function PlanBookPage({
  calendarMonth,
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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0 space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <ViewSwitcher date={selectedDate} view={view} />
          <PlanBookNav date={selectedDate} todayDate={todayDate} view={view} />
        </div>

        <UpcomingBirthdaysCard birthdays={upcomingBirthdays} />

        <DailyPlanner date={selectedDate} days={days} otherLessons={otherLessons} view={view} />
      </div>

      <aside className="space-y-4">
        <MiniCalendar
          monthKey={calendarMonth}
          selectedDate={selectedDate}
          todayDate={todayDate}
          view={view}
        />
        <DashboardStats
          classCount={data.classes.length}
          instructionalDayCount={buildInstructionalDays(data.schoolYear).length}
          unitCount={data.units.length}
        />
      </aside>
    </div>
  );
}
