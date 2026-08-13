import { AppShell } from "@/src/features/planner/AppShell";
import { AccountSettingsPage } from "@/src/features/planner/AccountSettingsPage";
import { SettingsTabs } from "@/src/features/planner/SettingsTabs";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getUserById, listUsers } from "@/src/lib/db/users-repository";
import { createAccountAction } from "./actions";

type AccountSettingsRouteProps = {
  searchParams: Promise<{ created?: string; error?: string; message?: string }>;
};

export const dynamic = "force-dynamic";

export default async function AccountSettingsRoute({ searchParams }: AccountSettingsRouteProps) {
  const userId = await requireAuth();

  const db = getClassPilotDatabase();
  const plannerData = getClassPilotPlannerData(userId);
  const currentUser = getUserById(db, userId);
  const users = listUsers(db);
  const query = await searchParams;

  return (
    <AppShell activePage="settings" data={plannerData}>
      <SettingsTabs active="account" />
      <AccountSettingsPage
        createAccountAction={createAccountAction}
        created={query.created === "1"}
        currentUsername={currentUser?.username ?? ""}
        errorMessage={query.error ? query.message : undefined}
        users={users}
      />
    </AppShell>
  );
}
