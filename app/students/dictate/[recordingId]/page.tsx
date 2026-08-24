import { notFound } from "next/navigation";
import { AppShell } from "@/src/features/planner/AppShell";
import { DictationDetailPage } from "@/src/features/dictation/DictationDetailPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getRecordingById } from "@/src/lib/db/dictation-repository";
import { listRoster } from "@/src/lib/db/students-repository";
import {
  deleteRecordingAction,
  dismissDraftAction,
  generateDraftsAction,
  saveDraftNoteAction,
  transcribeRecordingAction,
} from "../actions";

type DictationDetailRouteProps = {
  params: Promise<{ recordingId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export const dynamic = "force-dynamic";

export default async function DictationDetailRoute({
  params,
  searchParams,
}: DictationDetailRouteProps) {
  const userId = await requireAuth();
  const { recordingId } = await params;
  const query = await searchParams;
  const db = getClassPilotDatabase();
  const plannerData = getClassPilotPlannerData(userId);
  const recording = getRecordingById(db, userId, recordingId);

  if (!recording) {
    notFound();
  }

  const roster = listRoster(db, userId, recording.schoolYearId);

  return (
    <AppShell activePage="students" data={plannerData}>
      <DictationDetailPage
        deleteAction={deleteRecordingAction}
        dismissDraftAction={dismissDraftAction}
        error={query.error}
        generateDraftsAction={generateDraftsAction}
        recording={recording}
        roster={roster}
        saveDraftNoteAction={saveDraftNoteAction}
        transcribeAction={transcribeRecordingAction}
      />
    </AppShell>
  );
}
