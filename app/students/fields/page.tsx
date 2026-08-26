import { AppShell } from "@/src/features/planner/AppShell";
import { RosterFieldsGrid } from "@/src/features/students/RosterFieldsGrid";
import { requireAuth } from "@/src/lib/auth/server";
import {
  getClassPilotDatabase,
  getClassPilotPlannerData,
} from "@/src/lib/db/classpilot-db";
import { listRoster } from "@/src/lib/db/students-repository";
import {
  listRosterFields,
  listRosterFieldValues,
} from "@/src/lib/db/roster-fields-repository";
import {
  createRosterFieldAction,
  deleteRosterFieldAction,
  saveRosterFieldValueAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function RosterFieldsRoute() {
  const userId = await requireAuth();

  const plannerData = getClassPilotPlannerData(userId);
  const db = getClassPilotDatabase();
  const schoolYearId = plannerData.schoolYear.id;
  const roster = listRoster(db, userId, schoolYearId);
  const fields = listRosterFields(db, userId, schoolYearId);
  const values = listRosterFieldValues(db, userId, schoolYearId);

  return (
    <AppShell activePage="students" data={plannerData}>
      <RosterFieldsGrid
        createFieldAction={createRosterFieldAction}
        deleteFieldAction={deleteRosterFieldAction}
        fields={fields}
        roster={roster}
        saveValueAction={saveRosterFieldValueAction}
        schoolYearId={schoolYearId}
        values={values}
      />
    </AppShell>
  );
}
