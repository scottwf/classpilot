import { AppShell } from "./AppShell";
import { getAllLessons, resolvePlanBookDefaultDate } from "./lesson-queries";
import { PlanBookPage } from "./PlanBookPage";
import type { PlannerData, ScheduleSlot } from "./types";
import type { UpcomingBirthday } from "@/src/features/students/birthdays";

type ClassPilotPlannerProps = {
  calendarMonth?: string;
  data: PlannerData;
  dayNotes?: Record<string, string>;
  saveDayNoteAction?: (formData: FormData) => void | Promise<void>;
  scheduleSlots?: ScheduleSlot[];
  selectedDate?: string;
  todayDate?: string;
  upcomingBirthdays?: UpcomingBirthday[];
  view?: "day" | "week";
};

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function noopDayNoteAction() {
  // no-op default for callers (e.g. tests) that don't wire real persistence
}

export function ClassPilotPlanner({
  calendarMonth,
  data,
  dayNotes = {},
  saveDayNoteAction = noopDayNoteAction,
  scheduleSlots = [],
  selectedDate,
  todayDate,
  upcomingBirthdays = [],
  view = "day",
}: ClassPilotPlannerProps) {
  const resolvedToday = todayDate ?? todayDateKey();
  const resolvedSelectedDate =
    selectedDate ??
    resolvePlanBookDefaultDate(
      data.schoolYear,
      getAllLessons(data).map((lesson) => lesson.date),
      resolvedToday,
    );

  return (
    <AppShell activePage="planbook" data={data}>
      <PlanBookPage
        calendarMonth={calendarMonth}
        data={data}
        dayNotes={dayNotes}
        saveDayNoteAction={saveDayNoteAction}
        scheduleSlots={scheduleSlots}
        selectedDate={resolvedSelectedDate}
        todayDate={resolvedToday}
        upcomingBirthdays={upcomingBirthdays}
        view={view}
      />
    </AppShell>
  );
}
