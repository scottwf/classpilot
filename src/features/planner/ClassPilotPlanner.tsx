import { AppShell } from "./AppShell";
import { getAllLessons, resolvePlanBookDefaultDate } from "./lesson-queries";
import { PlanBookPage } from "./PlanBookPage";
import type { PlannerData, ScheduleSlot } from "./types";
import type { UpcomingBirthday } from "@/src/features/students/birthdays";

type ClassPilotPlannerProps = {
  data: PlannerData;
  scheduleSlots?: ScheduleSlot[];
  selectedDate?: string;
  todayDate?: string;
  upcomingBirthdays?: UpcomingBirthday[];
  view?: "day" | "week";
};

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function ClassPilotPlanner({
  data,
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
        data={data}
        scheduleSlots={scheduleSlots}
        selectedDate={resolvedSelectedDate}
        todayDate={resolvedToday}
        upcomingBirthdays={upcomingBirthdays}
        view={view}
      />
    </AppShell>
  );
}
