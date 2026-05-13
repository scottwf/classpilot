import { notFound } from "next/navigation";
import { AppShell } from "@/src/features/planner/AppShell";
import { UnitDetailPage } from "@/src/features/planner/UnitDetailPage";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getUnitById } from "@/src/lib/db/planner-repository";

type UnitPageProps = {
  params: Promise<{
    unitId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function UnitRoute({ params }: UnitPageProps) {
  await requireAuth();

  const { unitId } = await params;
  const plannerData = getClassPilotPlannerData();
  const unit = getUnitById(getClassPilotDatabase(), unitId);

  if (!unit) {
    notFound();
  }

  return (
    <AppShell activePage="units" data={plannerData}>
      <UnitDetailPage data={plannerData} unit={unit} />
    </AppShell>
  );
}
