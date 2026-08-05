import { AppShell } from "@/src/features/planner/AppShell";
import { AssistantPage } from "@/src/features/planner/AssistantPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import { isAiConfigured } from "@/src/lib/ai/config";
import { assistantAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AssistantRoutePage() {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const settings = getAppSettings(getClassPilotDatabase());
  const subjects = Array.from(
    new Set(plannerData.classes.map((section) => section.subject)),
  ).sort();

  return (
    <AppShell activePage="assistant" data={plannerData}>
      <AssistantPage
        action={assistantAction}
        aiConfigured={isAiConfigured({
          apiKey: settings.aiApiKey,
          baseUrl: settings.aiBaseUrl,
          model: settings.aiModel,
        })}
        classes={plannerData.classes}
        outcomes={plannerData.outcomes}
        startDate={plannerData.schoolYear.startDate}
        subjects={subjects}
      />
    </AppShell>
  );
}
