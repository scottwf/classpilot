import { AppShell } from "@/src/features/planner/AppShell";
import { CalendarSetupPage } from "@/src/features/planner/CalendarSetupPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import {
  addNonInstructionalDaysAction,
  removeNonInstructionalDayAction,
  updateSchoolYearDetailsAction,
} from "./actions";

type CalendarPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CalendarRoute({
  searchParams,
}: CalendarPageProps) {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const params = await searchParams;

  return (
    <AppShell activePage="calendar" data={plannerData}>
      <CalendarSetupPage
        actions={{
          updateDetails: updateSchoolYearDetailsAction,
          addDays: addNonInstructionalDaysAction,
          removeDay: removeNonInstructionalDayAction,
        }}
        error={params.error}
        schoolYear={plannerData.schoolYear}
      />
    </AppShell>
  );
}
