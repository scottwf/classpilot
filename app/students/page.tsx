import { AppShell } from "@/src/features/planner/AppShell";
import { RosterPage } from "@/src/features/students/RosterPage";
import { requireAuth } from "@/src/lib/auth/server";
import {
  getClassPilotDatabase,
  getClassPilotPlannerData,
} from "@/src/lib/db/classpilot-db";
import { listRoster } from "@/src/lib/db/students-repository";

export const dynamic = "force-dynamic";

export default async function StudentsRoute() {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const roster = listRoster(getClassPilotDatabase());

  return (
    <AppShell activePage="students" data={plannerData}>
      <RosterPage roster={roster} />
    </AppShell>
  );
}
