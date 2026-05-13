import { AppShell } from "@/src/features/planner/AppShell";
import { OutcomesPage } from "@/src/features/planner/OutcomesPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";

export const dynamic = "force-dynamic";

export default async function OutcomesRoute() {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();

  return (
    <AppShell activePage="outcomes" data={plannerData}>
      <OutcomesPage data={plannerData} />
    </AppShell>
  );
}
