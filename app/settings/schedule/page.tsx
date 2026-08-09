import { AppShell } from "@/src/features/planner/AppShell";
import { computeInstructionalTimeSummary } from "@/src/features/planner/instructional-time";
import { SchedulePage } from "@/src/features/planner/SchedulePage";
import { SettingsTabs } from "@/src/features/planner/SettingsTabs";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getScheduleSlots } from "@/src/lib/db/schedule-repository";
import { setClassScheduleAction } from "./actions";

type ScheduleSettingsRouteProps = {
  searchParams: Promise<{ conflictClassId?: string; conflictClassName?: string; error?: string; wizard?: string; }>;
};

export const dynamic = "force-dynamic";

export default async function ScheduleSettingsRoute({ searchParams }: ScheduleSettingsRouteProps) {
  await requireAuth();
  const plannerData = getClassPilotPlannerData();
  const db = getClassPilotDatabase();
  const schoolYearId = plannerData.schoolYear.id;
  const scheduleSlots = getScheduleSlots(db, schoolYearId);
  const instructionalTime = computeInstructionalTimeSummary(
    plannerData.schoolYear,
    plannerData.classes,
    scheduleSlots,
  );
  const query = await searchParams;

  return (
    <AppShell activePage="settings" data={plannerData}>
      <SettingsTabs active="schedule" />
      <SchedulePage
        action={setClassScheduleAction}
        classes={plannerData.classes}
        conflictClassId={query.conflictClassId}
        conflictClassName={query.conflictClassName}
        cycleLength={plannerData.schoolYear.cycleLength}
        dayLabelScheme={plannerData.schoolYear.dayLabelScheme}
        error={query.error}
        instructionalTime={instructionalTime}
        scheduleSlots={scheduleSlots}
        wizardMode={query.wizard === "1"}
      />
    </AppShell>
  );
}
