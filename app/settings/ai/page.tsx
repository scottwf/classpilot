import { AppShell } from "@/src/features/planner/AppShell";
import { AiProviderSettingsPage } from "@/src/features/planner/AiProviderSettingsPage";
import { isAiConfigured, isLocalAiConfigured } from "@/src/lib/ai/config";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import { clearAiApiKeyAction, updateSettingsAction } from "../actions";

type AiSettingsRouteProps = {
  searchParams: Promise<{ saved?: string }>;
};

export const dynamic = "force-dynamic";

export default async function AiSettingsRoute({ searchParams }: AiSettingsRouteProps) {
  const userId = await requireAuth();

  const plannerData = getClassPilotPlannerData(userId);
  const settings = getAppSettings(getClassPilotDatabase());
  const query = await searchParams;

  return (
    <AppShell activePage="settings" data={plannerData}>
      <AiProviderSettingsPage
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
        saved={query.saved}
        updateAction={updateSettingsAction}
      />
    </AppShell>
  );
}
