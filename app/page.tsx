import { ClassPilotPlanner } from "@/src/features/planner/ClassPilotPlanner";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    date?: string;
    view?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  await requireAuth();

  const params = await searchParams;
  const plannerData = getClassPilotPlannerData();
  const view = params.view === "week" ? "week" : "day";
  const selectedDate = params.date ?? "2026-09-11";

  return (
    <ClassPilotPlanner
      data={plannerData}
      selectedDate={selectedDate}
      view={view}
    />
  );
}
