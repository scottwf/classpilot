import { AppShell } from "./AppShell";
import { PlanBookPage } from "./PlanBookPage";
import type { PlannerData, ScheduleSlot } from "./types";
import type { UpcomingBirthday } from "@/src/features/students/birthdays";

type ClassPilotPlannerProps = {
  data: PlannerData;
  scheduleSlots?: ScheduleSlot[];
  selectedDate?: string;
  upcomingBirthdays?: UpcomingBirthday[];
  view?: "day" | "week";
};

const defaultSelectedDate = "2026-09-11";

export function ClassPilotPlanner({
  data,
  scheduleSlots = [],
  selectedDate = defaultSelectedDate,
  upcomingBirthdays = [],
  view = "day",
}: ClassPilotPlannerProps) {
  return (
    <AppShell activePage="planbook" data={data}>
      <PlanBookPage
        data={data}
        scheduleSlots={scheduleSlots}
        selectedDate={selectedDate}
        upcomingBirthdays={upcomingBirthdays}
        view={view}
      />
    </AppShell>
  );
}
