import { AppShell } from "@/src/features/planner/AppShell";
import { DictationListPage } from "@/src/features/dictation/DictationListPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { listRecordings } from "@/src/lib/db/dictation-repository";
import { listRoster } from "@/src/lib/db/students-repository";
import {
  archiveRecordingsAction,
  deleteRecordingsAction,
  submitTextDictationAction,
  uploadRecordingAction,
} from "./actions";

type DictateRouteProps = {
  searchParams: Promise<{ error?: string }>;
};

export const dynamic = "force-dynamic";

export default async function DictateRoute({ searchParams }: DictateRouteProps) {
  const userId = await requireAuth();
  const plannerData = getClassPilotPlannerData(userId);
  const params = await searchParams;
  const recordings = listRecordings(getClassPilotDatabase(), userId, plannerData.schoolYear.id, {
    includeArchived: true,
  });
  const roster = listRoster(getClassPilotDatabase(), userId, plannerData.schoolYear.id);

  return (
    <AppShell activePage="students" data={plannerData}>
      <DictationListPage
        error={params.error}
        recordings={recordings}
        archiveAction={archiveRecordingsAction}
        deleteAction={deleteRecordingsAction}
        students={roster}
        submitTextAction={submitTextDictationAction}
        uploadAction={uploadRecordingAction}
      />
    </AppShell>
  );
}
