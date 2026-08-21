import { notFound } from "next/navigation";
import { AppShell } from "@/src/features/planner/AppShell";
import { LessonDetailPage } from "@/src/features/planner/LessonDetailPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getLessonById } from "@/src/lib/db/planner-repository";
import { listAttachments } from "@/src/lib/db/attachments-repository";
import { extendLessonAction } from "./extend/actions";
import {
  createFileAttachmentAction,
  createLinkAttachmentAction,
  deleteAttachmentAction,
} from "@/app/attachments/actions";

type LessonPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
  searchParams: Promise<{
    attachmentError?: string;
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function LessonRoute({ params, searchParams }: LessonPageProps) {
  const userId = await requireAuth();

  const { lessonId } = await params;
  const query = await searchParams;
  const plannerData = getClassPilotPlannerData(userId);
  const db = getClassPilotDatabase();
  const lesson = getLessonById(db, userId, lessonId);

  if (!lesson) {
    notFound();
  }

  const attachments = listAttachments(db, userId, { lessonId });

  return (
    <AppShell activePage="lessons" data={plannerData}>
      <LessonDetailPage
        attachmentError={query.attachmentError}
        attachments={attachments}
        createFileAttachmentAction={createFileAttachmentAction}
        createLinkAttachmentAction={createLinkAttachmentAction}
        data={plannerData}
        deleteAttachmentAction={deleteAttachmentAction}
        error={query.error}
        extendAction={extendLessonAction}
        lesson={lesson}
      />
    </AppShell>
  );
}
