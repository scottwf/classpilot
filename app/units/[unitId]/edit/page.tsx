import { notFound } from "next/navigation";
import { AppShell } from "@/src/features/planner/AppShell";
import { UnitForm } from "@/src/features/planner/UnitForm";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getUnitById } from "@/src/lib/db/planner-repository";
import { updateUnitAction } from "./actions";

type EditUnitPageProps = {
  params: Promise<{
    unitId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditUnitPage({
  params,
  searchParams,
}: EditUnitPageProps) {
  await requireAuth();

  const { unitId } = await params;
  const plannerData = getClassPilotPlannerData();
  const unit = getUnitById(getClassPilotDatabase(), unitId);
  const query = await searchParams;

  if (!unit) {
    notFound();
  }

  return (
    <AppShell activePage="units" data={plannerData}>
      <section>
        <p className="text-sm font-medium text-blue-700">Edit unit</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Update unit planning details.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Adjust timing, subject row, color, and outcome coverage before
          building lessons.
        </p>
      </section>

      <UnitForm
        action={updateUnitAction}
        classes={plannerData.classes}
        error={query.error}
        mode="edit"
        outcomes={plannerData.outcomes}
        unit={unit}
      />
    </AppShell>
  );
}
