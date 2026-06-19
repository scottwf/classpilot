import { AppShell } from "@/src/features/planner/AppShell";
import { StudentForm } from "@/src/features/students/StudentForm";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { createStudentAction } from "./actions";

type NewStudentPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NewStudentPage({
  searchParams,
}: NewStudentPageProps) {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const params = await searchParams;

  return (
    <AppShell activePage="students" data={plannerData}>
      <section>
        <p className="text-sm font-medium text-blue-700">New student</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Add a student to the roster.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Start with the basics. You can add contacts, notes, accommodations,
          and reminders from the profile.
        </p>
      </section>

      <StudentForm
        action={createStudentAction}
        error={params.error}
        mode="create"
      />
    </AppShell>
  );
}
