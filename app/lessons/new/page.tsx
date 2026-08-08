import { AppShell } from "@/src/features/planner/AppShell";
import { LessonForm } from "@/src/features/planner/LessonForm";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import { isAiConfigured } from "@/src/lib/ai/config";
import { createLessonAction } from "./actions";

type NewLessonPageProps = {
  searchParams: Promise<{
    classId?: string;
    error?: string;
    unitId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NewLessonPage({
  searchParams,
}: NewLessonPageProps) {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const settings = getAppSettings(getClassPilotDatabase());
  const params = await searchParams;

  return (
    <AppShell activePage="lessons" data={plannerData}>
      <section>
        <p className="text-sm font-medium text-blue-700">New lesson</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Add a lesson to the plan book.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Save a planned lesson to SQLite and connect it to a unit and any
          outcomes you want to track.
        </p>
      </section>

      <LessonForm
        action={createLessonAction}
        aiConfigured={isAiConfigured({
          apiKey: settings.aiApiKey,
          baseUrl: settings.aiBaseUrl,
          model: settings.aiModel,
        })}
        classes={plannerData.classes}
        error={params.error}
        initialClassId={params.classId}
        initialUnitId={params.unitId}
        mode="create"
        outcomes={plannerData.outcomes}
        units={plannerData.units}
      />
    </AppShell>
  );
}
