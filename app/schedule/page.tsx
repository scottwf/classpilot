import { AppShell } from "@/src/features/planner/AppShell";
import { SchedulePage } from "@/src/features/planner/SchedulePage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getPeriods, getScheduleSlots } from "@/src/lib/db/schedule-repository";
import {
  assignScheduleSlotAction,
  createPeriodAction,
  deletePeriodAction,
  removeScheduleSlotAction,
} from "./actions";

type ScheduleRouteProps = {
  searchParams: Promise<{
    conflictClassId?: string;
    conflictWith?: string;
    day?: string;
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
  const periods = getPeriods(db, schoolYearId);
  const scheduleSlots = getScheduleSlots(db, schoolYearId);
  const query = await searchParams;

  const cycleLength = plannerData.schoolYear.cycleLength;
  const requestedDay = Number(query.day);
  const selectedDay =
    Number.isInteger(requestedDay) && requestedDay >= 1 && requestedDay <= cycleLength
      ? requestedDay
      : 1;

  return (
    <AppShell activePage="schedule" data={plannerData}>
      <SchedulePage
        actions={{
          assignSlot: assignScheduleSlotAction,
          createPeriod: createPeriodAction,
          deletePeriod: deletePeriodAction,
          removeSlot: removeScheduleSlotAction,
        }}
        classes={plannerData.classes}
        conflictClassId={query.conflictClassId}
        conflictWith={query.conflictWith}
        cycleLength={cycleLength}
        dayLabelScheme={plannerData.schoolYear.dayLabelScheme}
        error={query.error}
        periods={periods}
        scheduleSlots={scheduleSlots}
        selectedDay={selectedDay}
        wizardMode={query.wizard === "1"}
      />
    </AppShell>
  );
}
