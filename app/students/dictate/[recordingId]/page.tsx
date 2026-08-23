import { notFound } from "next/navigation";
import { AppShell } from "@/src/features/planner/AppShell";
import { DictationDetailPage } from "@/src/features/dictation/DictationDetailPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getRecordingById } from "@/src/lib/db/dictation-repository";
import { deleteRecordingAction, transcribeRecordingAction } from "../actions";

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
  const plannerData = getClassPilotPlannerData(userId);
  const recording = getRecordingById(getClassPilotDatabase(), userId, recordingId);

  if (!recording) {
    notFound();
  }

  return (
    <AppShell activePage="students" data={plannerData}>
      <DictationDetailPage
        deleteAction={deleteRecordingAction}
        error={query.error}
        recording={recording}
        transcribeAction={transcribeRecordingAction}
      />
    </AppShell>
  );
}
