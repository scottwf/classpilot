import { AppShell } from "@/src/features/planner/AppShell";
import { AssistantPage } from "@/src/features/planner/AssistantPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { isAiConfigured } from "@/src/lib/ai/config";
import { generateUnitOutlineAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AssistantRoutePage() {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const subjects = Array.from(
    new Set(plannerData.classes.map((section) => section.subject)),
  ).sort();

  return (
    <AppShell activePage="assistant" data={plannerData}>
      <AssistantPage
        action={generateUnitOutlineAction}
        aiConfigured={isAiConfigured()}
        outcomes={plannerData.outcomes}
        subjects={subjects}
      />
    </AppShell>
  );
}
