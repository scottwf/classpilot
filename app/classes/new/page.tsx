import { AppShell } from "@/src/features/planner/AppShell";
import { ClassForm } from "@/src/features/planner/ClassForm";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { createClassAction } from "../actions";

type NewClassPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NewClassPage({ searchParams }: NewClassPageProps) {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const params = await searchParams;

  return (
    <AppShell activePage="classes" data={plannerData}>
      <section>
        <p className="text-sm font-medium text-blue-700">New class</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Add a class.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Classes are the rows on the unit timeline. Set its day-cycle
          membership so scheduling only lands on days it actually meets.
        </p>
      </section>

      <ClassForm
        action={createClassAction}
        cycleLength={plannerData.schoolYear.cycleLength}
        error={params.error}
        mode="create"
      />
    </AppShell>
  );
}
