import { AppShell } from "@/src/features/planner/AppShell";
import { UnitForm } from "@/src/features/planner/UnitForm";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { createUnitAction } from "./actions";

type NewUnitPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NewUnitPage({ searchParams }: NewUnitPageProps) {
  const userId = await requireAuth();

  const plannerData = getClassPilotPlannerData(userId);
  const params = await searchParams;

  return (
    <AppShell activePage="units" data={plannerData}>
      <section>
        <p className="text-sm font-medium text-blue-700">New unit</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Add a unit to the year plan.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Create the unit first, then build lessons inside it.
        </p>
      </section>

      <UnitForm
        action={createUnitAction}
        classes={plannerData.classes}
        error={params.error}
        mode="create"
        outcomes={plannerData.outcomes}
        schoolYear={plannerData.schoolYear}
        units={plannerData.units}
      />
    </AppShell>
  );
}
