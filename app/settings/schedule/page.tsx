import { AppShell } from "@/src/features/planner/AppShell";
import { computeInstructionalTimeSummary } from "@/src/features/planner/instructional-time";
import { SchedulePage } from "@/src/features/planner/SchedulePage";
import { SettingsTabs } from "@/src/features/planner/SettingsTabs";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getScheduleSlots } from "@/src/lib/db/schedule-repository";
import {
  addTemporaryScheduleSlotAction,
  deleteTemporaryScheduleSlotAction,
  setClassScheduleAction,
} from "./actions";

type ScheduleSettingsRouteProps = {
  searchParams: Promise<{
    conflictClassId?: string;
    conflictClassName?: string;
    error?: string;
    swapNotice?: string;
    temporaryAdded?: string;
    wizard?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ScheduleSettingsRoute({ searchParams }: ScheduleSettingsRouteProps) {
  const userId = await requireAuth();
  const plannerData = getClassPilotPlannerData(userId);
  const db = getClassPilotDatabase();
  const schoolYearId = plannerData.schoolYear.id;
  const scheduleSlots = getScheduleSlots(db, userId, schoolYearId);
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
        addTemporaryAction={addTemporaryScheduleSlotAction}
        classes={plannerData.classes}
        conflictClassId={query.conflictClassId}
        conflictClassName={query.conflictClassName}
        cycleLength={plannerData.schoolYear.cycleLength}
        dayLabelScheme={plannerData.schoolYear.dayLabelScheme}
        deleteTemporaryAction={deleteTemporaryScheduleSlotAction}
        error={query.error}
        instructionalTime={instructionalTime}
        scheduleSlots={scheduleSlots}
        swapNotice={query.swapNotice}
        temporaryAdded={query.temporaryAdded === "1"}
        wizardMode={query.wizard === "1"}
      />
    </AppShell>
  );
}
