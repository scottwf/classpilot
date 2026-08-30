import { AppShell } from "@/src/features/planner/AppShell";
import { OutlinePage } from "@/src/features/planner/OutlinePage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";

type OutlineRouteProps = {
  searchParams: Promise<{
    classId?: string;
    lessonId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function OutlineRoute({ searchParams }: OutlineRouteProps) {
  const userId = await requireAuth();

  const plannerData = getClassPilotPlannerData(userId);
  const params = await searchParams;
  const selectedClassId = params.classId ?? plannerData.classes[0]?.id;

  return (
    <AppShell activePage="outline" data={plannerData}>
      <OutlinePage
        data={plannerData}
        selectedClassId={selectedClassId}
        selectedLessonId={params.lessonId}
      />
    </AppShell>
  );
}
