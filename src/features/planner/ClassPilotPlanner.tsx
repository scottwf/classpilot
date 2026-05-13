import { AppShell } from "./AppShell";
import { PlanBookPage } from "./PlanBookPage";
import type { PlannerData } from "./types";

type ClassPilotPlannerProps = {
  data: PlannerData;
  selectedDate?: string;
  view?: "day" | "week";
};

const defaultSelectedDate = "2026-09-11";

export function ClassPilotPlanner({
  data,
  selectedDate = defaultSelectedDate,
  view = "day",
}: ClassPilotPlannerProps) {
  return (
    <AppShell activePage="planbook" data={data}>
      <PlanBookPage data={data} selectedDate={selectedDate} view={view} />
    </AppShell>
  );
}
