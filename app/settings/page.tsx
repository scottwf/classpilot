import { AppShell } from "@/src/features/planner/AppShell";
import { ClassesPage } from "@/src/features/planner/ClassesPage";
import { SettingsPage } from "@/src/features/planner/SettingsPage";
import { isAiConfigured, isLocalAiConfigured } from "@/src/lib/ai/config";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { listSchoolYears } from "@/src/lib/db/planner-repository";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import { deleteClassAction } from "../classes/actions";
import {
  clearAiApiKeyAction,
  deleteSchoolYearAction,
  resetPlannerDataAction,
  switchSchoolYearAction,
  updateSettingsAction,
} from "./actions";

type SettingsRouteProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function SettingsRoute({ searchParams }: SettingsRouteProps) {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const settings = getAppSettings(getClassPilotDatabase());
  const schoolYears = listSchoolYears(getClassPilotDatabase());
  const query = await searchParams;

  return (
    <AppShell activePage="settings" data={plannerData}>
      <SettingsPage
        activeSchoolYearId={plannerData.schoolYear.id}
        aiApiKeySet={settings.aiApiKey !== ""}
        aiBaseUrl={settings.aiBaseUrl}
        aiConfigured={isAiConfigured({
          apiKey: settings.aiApiKey,
          baseUrl: settings.aiBaseUrl,
          model: settings.aiModel,
        })}
        aiModel={settings.aiModel}
        aiLocalBaseUrl={settings.aiLocalBaseUrl}
        aiLocalConfigured={isLocalAiConfigured({
          baseUrl: settings.aiLocalBaseUrl,
          model: settings.aiLocalModel,
        })}
        aiLocalModel={settings.aiLocalModel}
        clearApiKeyAction={clearAiApiKeyAction}
        deleteYearAction={deleteSchoolYearAction}
        error={query.error}
        resetPlannerDataAction={resetPlannerDataAction}
        saved={query.saved}
        schoolYears={schoolYears}
        switchYearAction={switchSchoolYearAction}
        updateAction={updateSettingsAction}
      />
      <ClassesPage data={plannerData} deleteAction={deleteClassAction} />
    </AppShell>
  );
}
