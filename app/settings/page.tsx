import { AppShell } from "@/src/features/planner/AppShell";
import { SettingsPage } from "@/src/features/planner/SettingsPage";
import { isAiConfigured } from "@/src/lib/ai/config";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import { clearAiApiKeyAction, updateSettingsAction } from "./actions";

type SettingsRouteProps = {
  searchParams: Promise<{
    saved?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function SettingsRoute({ searchParams }: SettingsRouteProps) {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const settings = getAppSettings(getClassPilotDatabase());
  const query = await searchParams;

  return (
    <AppShell activePage="settings" data={plannerData}>
      <SettingsPage
        aiApiKeySet={settings.aiApiKey !== ""}
        aiBaseUrl={settings.aiBaseUrl}
        aiConfigured={isAiConfigured({
          apiKey: settings.aiApiKey,
          baseUrl: settings.aiBaseUrl,
          model: settings.aiModel,
        })}
        aiModel={settings.aiModel}
        clearApiKeyAction={clearAiApiKeyAction}
        saved={query.saved}
        updateAction={updateSettingsAction}
      />
    </AppShell>
  );
}
