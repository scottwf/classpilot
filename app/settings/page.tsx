import { AppShell } from "@/src/features/planner/AppShell";
import { SettingsPage } from "@/src/features/planner/SettingsPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { listSchoolYears } from "@/src/lib/db/planner-repository";
import {
  deleteSchoolYearAction,
  resetPlannerDataAction,
  switchSchoolYearAction,
} from "./actions";

type SettingsRouteProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function SettingsRoute({ searchParams }: SettingsRouteProps) {
  const userId = await requireAuth();

  const plannerData = getClassPilotPlannerData(userId);
  const schoolYears = listSchoolYears(getClassPilotDatabase(), userId);
  const query = await searchParams;

  return (
    <AppShell activePage="settings" data={plannerData}>
      <SettingsPage
        activeSchoolYearId={plannerData.schoolYear.id}
        deleteYearAction={deleteSchoolYearAction}
        error={query.error}
        resetPlannerDataAction={resetPlannerDataAction}
        saved={query.saved}
        schoolYears={schoolYears}
        switchYearAction={switchSchoolYearAction}
      />
    </AppShell>
  );
}
