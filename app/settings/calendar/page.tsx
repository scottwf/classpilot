import { AppShell } from "@/src/features/planner/AppShell";
import { CalendarSetupPage } from "@/src/features/planner/CalendarSetupPage";
import { SettingsTabs } from "@/src/features/planner/SettingsTabs";
import { requireAuth } from "@/src/lib/auth/server";
import { getCalendarToken } from "@/src/lib/auth/secrets";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { cancelInstructionalDayAction, updateBlockedDatesAction, updateSchoolYearDetailsAction } from "./actions";

type CalendarSettingsRouteProps = {
  searchParams: Promise<{ error?: string; }>;
};

export const dynamic = "force-dynamic";

export default async function CalendarSettingsRoute({ searchParams }: CalendarSettingsRouteProps) {
  const userId = await requireAuth();
  const plannerData = getClassPilotPlannerData(userId);
  const params = await searchParams;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3020";
  const feedUrl = `${appUrl}/calendar/feed.ics?token=${getCalendarToken()}`;

  return (
    <AppShell activePage="settings" data={plannerData}>
      <SettingsTabs active="calendar" />
      <CalendarSetupPage
        actions={{
          updateDetails: updateSchoolYearDetailsAction,
          updateBlockedDates: updateBlockedDatesAction,
          cancelDay: cancelInstructionalDayAction,
        }}
        error={params.error}
        feedUrl={feedUrl}
        schoolYear={plannerData.schoolYear}
      />
    </AppShell>
  );
}
