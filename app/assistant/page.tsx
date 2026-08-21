import { AppShell } from "@/src/features/planner/AppShell";
import { AssistantChatPage } from "@/src/features/planner/AssistantChatPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import { isAiConfigured, isLocalAiConfigured } from "@/src/lib/ai/config";

export const dynamic = "force-dynamic";

export default async function AssistantRoutePage() {
  const userId = await requireAuth();

  const plannerData = getClassPilotPlannerData(userId);
  const settings = getAppSettings(getClassPilotDatabase());

  return (
    <AppShell activePage="assistant" data={plannerData}>
      <AssistantChatPage
        aiConfigured={isAiConfigured({
          apiKey: settings.aiApiKey,
          baseUrl: settings.aiBaseUrl,
          model: settings.aiModel,
        })}
        aiLocalConfigured={isLocalAiConfigured({
          baseUrl: settings.aiLocalBaseUrl,
          model: settings.aiLocalModel,
        })}
      />
    </AppShell>
  );
}
