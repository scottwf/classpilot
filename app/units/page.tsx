import { AppShell } from "@/src/features/planner/AppShell";
import { UnitsPage } from "@/src/features/planner/UnitsPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";

export const dynamic = "force-dynamic";

export default async function UnitsRoute() {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();

  return (
    <AppShell activePage="units" data={plannerData}>
      <UnitsPage data={plannerData} />
    </AppShell>
  );
}
