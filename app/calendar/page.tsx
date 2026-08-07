import { AppShell } from "@/src/features/planner/AppShell";
import { CalendarSetupPage } from "@/src/features/planner/CalendarSetupPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getCalendarToken } from "@/src/lib/auth/secrets";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { listSchoolYears } from "@/src/lib/db/planner-repository";
import {
  addNonInstructionalDaysAction,
  cancelInstructionalDayAction,
  deleteSchoolYearAction,
  removeNonInstructionalDayAction,
  switchSchoolYearAction,
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
  const schoolYears = listSchoolYears(getClassPilotDatabase());
  const params = await searchParams;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3020";
  const feedUrl = `${appUrl}/calendar/feed.ics?token=${getCalendarToken()}`;

  return (
    <AppShell activePage="calendar" data={plannerData}>
      <CalendarSetupPage
        actions={{
          updateDetails: updateSchoolYearDetailsAction,
          addDays: addNonInstructionalDaysAction,
          removeDay: removeNonInstructionalDayAction,
          cancelDay: cancelInstructionalDayAction,
          switchYear: switchSchoolYearAction,
          deleteYear: deleteSchoolYearAction,
        }}
        error={params.error}
        feedUrl={feedUrl}
        schoolYear={plannerData.schoolYear}
        schoolYears={schoolYears}
      />
    </AppShell>
  );
}
