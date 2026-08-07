import { AppShell } from "./AppShell";
import { PlanBookPage } from "./PlanBookPage";
import type { PlannerData, ScheduleSlot } from "./types";

type ClassPilotPlannerProps = {
  data: PlannerData;
  scheduleSlots?: ScheduleSlot[];
  selectedDate?: string;
  view?: "day" | "week";
};

const defaultSelectedDate = "2026-09-11";

export function ClassPilotPlanner({
  data,
  scheduleSlots = [],
  selectedDate = defaultSelectedDate,
  view = "day",
}: ClassPilotPlannerProps) {
  return (
    <AppShell activePage="planbook" data={data}>
      <PlanBookPage
        data={data}
        scheduleSlots={scheduleSlots}
        selectedDate={selectedDate}
        view={view}
      />
    </AppShell>
  );
}
