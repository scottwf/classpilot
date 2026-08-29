import { AppShell } from "./AppShell";
import { getAllLessons, resolvePlanBookDefaultDate } from "./lesson-queries";
import { PlanBookPage } from "./PlanBookPage";
import type { PlannerData, ScheduleException, ScheduleSlot } from "./types";
import type { UpcomingBirthday } from "@/src/features/students/birthdays";

type ClassPilotPlannerProps = {
  calendarMonth?: string;
  cancelClassMeetingAction?: (formData: FormData) => void | Promise<void>;
  data: PlannerData;
  dayNotes?: Record<string, string>;
  notice?: string;
  restoreClassMeetingAction?: (formData: FormData) => void | Promise<void>;
  saveDayNoteAction?: (formData: FormData) => void | Promise<void>;
  scheduleExceptions?: ScheduleException[];
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
  cancelClassMeetingAction,
  data,
  dayNotes = {},
  notice,
  restoreClassMeetingAction,
  saveDayNoteAction = noopDayNoteAction,
  scheduleExceptions = [],
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
      getAllLessons(data)
        .map((lesson) => lesson.date)
        .filter((date): date is string => date !== null),
      resolvedToday,
    );

  return (
    <AppShell activePage="planbook" data={data}>
      <PlanBookPage
        calendarMonth={calendarMonth}
        cancelClassMeetingAction={cancelClassMeetingAction}
        data={data}
        dayNotes={dayNotes}
        notice={notice}
        restoreClassMeetingAction={restoreClassMeetingAction}
        saveDayNoteAction={saveDayNoteAction}
        scheduleExceptions={scheduleExceptions}
        scheduleSlots={scheduleSlots}
        selectedDate={resolvedSelectedDate}
        todayDate={resolvedToday}
        upcomingBirthdays={upcomingBirthdays}
        view={view}
      />
    </AppShell>
  );
}
