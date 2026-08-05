import { AppShell } from "@/src/features/planner/AppShell";
import { ClassesPage } from "@/src/features/planner/ClassesPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { deleteClassAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ClassesRoute() {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();

  return (
    <AppShell activePage="classes" data={plannerData}>
      <ClassesPage data={plannerData} deleteAction={deleteClassAction} />
    </AppShell>
  );
}
