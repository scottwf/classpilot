import { AppShell } from "@/src/features/planner/AppShell";
import { ClassesPage } from "@/src/features/planner/ClassesPage";
import { SettingsTabs } from "@/src/features/planner/SettingsTabs";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { deleteClassAction } from "../../classes/actions";

export const dynamic = "force-dynamic";

export default async function ClassesSettingsRoute() {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();

  return (
    <AppShell activePage="settings" data={plannerData}>
      <SettingsTabs active="classes" />
      <ClassesPage data={plannerData} deleteAction={deleteClassAction} />
    </AppShell>
  );
}
