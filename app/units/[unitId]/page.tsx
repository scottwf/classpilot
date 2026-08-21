import { notFound } from "next/navigation";
import { AppShell } from "@/src/features/planner/AppShell";
import { UnitDetailPage } from "@/src/features/planner/UnitDetailPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getUnitById } from "@/src/lib/db/planner-repository";
import { listAttachments } from "@/src/lib/db/attachments-repository";
import { cascadeRescheduleAction } from "./reschedule/actions";
import {
  createFileAttachmentAction,
  createLinkAttachmentAction,
  deleteAttachmentAction,
} from "@/app/attachments/actions";
import { importLessonMarkdownBatchAction } from "@/app/lessons/import/actions";

type UnitPageProps = {
  params: Promise<{
    unitId: string;
  }>;
  searchParams: Promise<{
    attachmentError?: string;
    error?: string;
    imported?: string;
    importError?: string;
    importFailed?: string;
    rescheduled?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function UnitRoute({ params, searchParams }: UnitPageProps) {
  const userId = await requireAuth();

  const { unitId } = await params;
  const query = await searchParams;
  const plannerData = getClassPilotPlannerData(userId);
  const db = getClassPilotDatabase();
  const unit = getUnitById(db, userId, unitId);

  if (!unit) {
    notFound();
  }

  const attachments = listAttachments(db, userId, { unitId });

  return (
    <AppShell activePage="units" data={plannerData}>
      <UnitDetailPage
        attachmentError={query.attachmentError}
        attachments={attachments}
        createFileAttachmentAction={createFileAttachmentAction}
        createLinkAttachmentAction={createLinkAttachmentAction}
        data={plannerData}
        deleteAttachmentAction={deleteAttachmentAction}
        error={query.error}
        importBatchAction={importLessonMarkdownBatchAction}
        imported={query.imported}
        importError={query.importError}
        importFailed={query.importFailed}
        rescheduleAction={cascadeRescheduleAction}
        rescheduled={query.rescheduled}
        unit={unit}
      />
    </AppShell>
  );
}
