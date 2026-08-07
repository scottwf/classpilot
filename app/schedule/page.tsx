import { AppShell } from "@/src/features/planner/AppShell";
import { SchedulePage } from "@/src/features/planner/SchedulePage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getScheduleSlots } from "@/src/lib/db/schedule-repository";
import { setClassScheduleAction } from "./actions";

type ScheduleRouteProps = {
  searchParams: Promise<{
    conflictClassId?: string;
    conflictClassName?: string;
    error?: string;
    wizard?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ScheduleRoute({ searchParams }: ScheduleRouteProps) {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const db = getClassPilotDatabase();
  const schoolYearId = plannerData.schoolYear.id;
  const scheduleSlots = getScheduleSlots(db, schoolYearId);
  const query = await searchParams;

  return (
    <AppShell activePage="schedule" data={plannerData}>
      <SchedulePage
        action={setClassScheduleAction}
        classes={plannerData.classes}
        conflictClassId={query.conflictClassId}
        conflictClassName={query.conflictClassName}
        cycleLength={plannerData.schoolYear.cycleLength}
        dayLabelScheme={plannerData.schoolYear.dayLabelScheme}
        error={query.error}
        scheduleSlots={scheduleSlots}
        wizardMode={query.wizard === "1"}
      />
    </AppShell>
  );
}
