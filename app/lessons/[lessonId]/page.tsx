import { notFound } from "next/navigation";
import { AppShell } from "@/src/features/planner/AppShell";
import { LessonDetailPage } from "@/src/features/planner/LessonDetailPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getLessonById } from "@/src/lib/db/planner-repository";
import { extendLessonAction } from "./extend/actions";

type LessonPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function LessonRoute({ params, searchParams }: LessonPageProps) {
  await requireAuth();

  const { lessonId } = await params;
  const query = await searchParams;
  const plannerData = getClassPilotPlannerData();
  const lesson = getLessonById(getClassPilotDatabase(), lessonId);

  if (!lesson) {
    notFound();
  }

  return (
    <AppShell activePage="lessons" data={plannerData}>
      <LessonDetailPage
        data={plannerData}
        error={query.error}
        extendAction={extendLessonAction}
        lesson={lesson}
      />
    </AppShell>
  );
}
