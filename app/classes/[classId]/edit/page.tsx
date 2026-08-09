import { notFound } from "next/navigation";
import { AppShell } from "@/src/features/planner/AppShell";
import { ClassForm } from "@/src/features/planner/ClassForm";
import { groupSubjectsByGrade } from "@/src/features/planner/curriculum-subjects";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getClassById } from "@/src/lib/db/planner-repository";
import { updateClassAction } from "../../actions";

type EditClassPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditClassPage({
  params,
  searchParams,
}: EditClassPageProps) {
  await requireAuth();

  const { classId } = await params;
  const query = await searchParams;
  const plannerData = getClassPilotPlannerData();
  const classSection = getClassById(getClassPilotDatabase(), classId);

  if (!classSection) {
    notFound();
  }

  return (
    <AppShell activePage="classes" data={plannerData}>
      <section>
        <p className="text-sm font-medium text-blue-700">Edit class</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Update {classSection.name}.
        </h2>
      </section>

      <ClassForm
        action={updateClassAction}
        classSection={classSection}
        error={query.error}
        existingClasses={plannerData.classes}
        gradeSubjects={groupSubjectsByGrade(plannerData.outcomes)}
        mode="edit"
      />
    </AppShell>
  );
}
