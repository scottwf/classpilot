import { notFound } from "next/navigation";
import { AppShell } from "@/src/features/planner/AppShell";
import { LessonForm } from "@/src/features/planner/LessonForm";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getLessonById } from "@/src/lib/db/planner-repository";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import { isAiConfigured } from "@/src/lib/ai/config";
import { updateLessonAction } from "./actions";

type EditLessonPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditLessonPage({
  params,
  searchParams,
}: EditLessonPageProps) {
  const userId = await requireAuth();

  const { lessonId } = await params;
  const plannerData = getClassPilotPlannerData(userId);
  const db = getClassPilotDatabase();
  const lesson = getLessonById(db, userId, lessonId);
  const settings = getAppSettings(db);
  const query = await searchParams;

  if (!lesson) {
    notFound();
  }

  return (
    <AppShell activePage="lessons" data={plannerData}>
      <section>
        <p className="text-sm font-medium text-blue-700">Edit lesson</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Update lesson details.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Adjust timing, status, unit placement, summary, and outcome links.
        </p>
      </section>

      <LessonForm
        action={updateLessonAction}
        aiConfigured={isAiConfigured({
          apiKey: settings.aiApiKey,
          baseUrl: settings.aiBaseUrl,
          model: settings.aiModel,
        })}
        classes={plannerData.classes}
        error={query.error}
        lesson={lesson}
        mode="edit"
        outcomes={plannerData.outcomes}
        units={plannerData.units}
      />
    </AppShell>
  );
}
