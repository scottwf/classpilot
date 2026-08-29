import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { buildDayAgenda } from "./day-agenda";
import { getDayInfo } from "./cycle";
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
import type { PlannerData, ScheduleException, ScheduleSlot } from "./types";
import { UpcomingBirthdaysCard } from "./UpcomingBirthdaysCard";
import { ViewSwitcher } from "./ViewSwitcher";
import type { UpcomingBirthday } from "@/src/features/students/birthdays";

type PlanBookPageProps = {
  calendarMonth?: string;
  cancelClassMeetingAction?: (formData: FormData) => void | Promise<void>;
  data: PlannerData;
  dayNotes?: Record<string, string>;
  notice?: string;
  restoreClassMeetingAction?: (formData: FormData) => void | Promise<void>;
  saveDayNoteAction?: (formData: FormData) => void | Promise<void>;
  scheduleExceptions?: ScheduleException[];
  scheduleSlots: ScheduleSlot[];
  selectedDate: string;
  todayDate: string;
  upcomingBirthdays?: UpcomingBirthday[];
  view: "day" | "week";
};

export function PlanBookPage({
  calendarMonth,
  cancelClassMeetingAction,
  data,
  dayNotes = {},
  notice,
  restoreClassMeetingAction,
  saveDayNoteAction,
  scheduleExceptions = [],
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
      data.units,
      scheduleExceptions,
    ),
  }));

  const scheduledLessonIds = new Set(
    days.flatMap((day) =>
      day.entries.flatMap((entry) =>
        [entry.lesson, entry.substituteLesson]
          .filter((lesson): lesson is NonNullable<typeof lesson> => lesson !== undefined)
          .map((lesson) => lesson.id),
      ),
    ),
  );
  const otherLessons = lessonsInRange.filter((lesson) => !scheduledLessonIds.has(lesson.id));
  const dayInfoByDate = Object.fromEntries(
    dates.map((date) => [date, getDayInfo(data.schoolYear, date)]),
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0 space-y-5">
        {notice === "lesson-moved" ? (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
            A lesson on this date was moved to the next class meeting.
          </p>
        ) : null}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <ViewSwitcher date={selectedDate} view={view} />
          <PlanBookNav date={selectedDate} todayDate={todayDate} view={view} />
        </div>

        <UpcomingBirthdaysCard birthdays={upcomingBirthdays} />

        <DailyPlanner
          cancelClassMeetingAction={cancelClassMeetingAction}
          classes={data.classes}
          date={selectedDate}
          dayInfoByDate={dayInfoByDate}
          dayNotes={dayNotes}
          days={days}
          otherLessons={otherLessons}
          restoreClassMeetingAction={restoreClassMeetingAction}
          saveDayNoteAction={saveDayNoteAction}
          schoolYearId={data.schoolYear.id}
          view={view}
        />
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
        <Link
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          href="/settings/calendar"
        >
          <CalendarPlus aria-hidden="true" className="size-4" />
          Subscribe to calendar feeds
        </Link>
      </aside>
    </div>
  );
}
