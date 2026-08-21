import { AppShell } from "@/src/features/planner/AppShell";
import { LessonsPage } from "@/src/features/planner/LessonsPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";

export const dynamic = "force-dynamic";

export default async function LessonsRoute() {
  const userId = await requireAuth();

  const plannerData = getClassPilotPlannerData(userId);

  return (
    <AppShell activePage="lessons" data={plannerData}>
      <LessonsPage data={plannerData} />
    </AppShell>
  );
}
