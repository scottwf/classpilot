import { AppShell } from "@/src/features/planner/AppShell";
import { RosterGrid } from "@/src/features/students/RosterGrid";
import { requireAuth } from "@/src/lib/auth/server";
import {
  getClassPilotDatabase,
  getClassPilotPlannerData,
} from "@/src/lib/db/classpilot-db";
import { getPrimaryContactMap, listRoster } from "@/src/lib/db/students-repository";
import {
  listRosterFields,
  listRosterFieldValues,
} from "@/src/lib/db/roster-fields-repository";
import { listRosterViews } from "@/src/lib/db/roster-views-repository";
import {
  createRosterFieldAction,
  createRosterViewAction,
  deleteRosterFieldAction,
  deleteRosterViewAction,
  saveContactFieldAction,
  saveRosterFieldValueAction,
  saveStudentFieldAction,
} from "./roster-actions";

export const dynamic = "force-dynamic";

export default async function StudentsRoute() {
  const userId = await requireAuth();

  const plannerData = getClassPilotPlannerData(userId);
  const db = getClassPilotDatabase();
  const schoolYearId = plannerData.schoolYear.id;
  const roster = listRoster(db, userId, schoolYearId);
  const fields = listRosterFields(db, userId, schoolYearId);
  const fieldValues = listRosterFieldValues(db, userId, schoolYearId);
  const primaryContacts = getPrimaryContactMap(db, userId, schoolYearId);
  const views = listRosterViews(db, userId, schoolYearId);

  return (
    <AppShell activePage="students" data={plannerData}>
      <RosterGrid
        createFieldAction={createRosterFieldAction}
        createViewAction={createRosterViewAction}
        deleteFieldAction={deleteRosterFieldAction}
        deleteViewAction={deleteRosterViewAction}
        fields={fields}
        fieldValues={fieldValues}
        primaryContacts={primaryContacts}
        roster={roster}
        saveContactFieldAction={saveContactFieldAction}
        saveFieldValueAction={saveRosterFieldValueAction}
        saveStudentFieldAction={saveStudentFieldAction}
        schoolYearId={schoolYearId}
        views={views}
      />
    </AppShell>
  );
}
