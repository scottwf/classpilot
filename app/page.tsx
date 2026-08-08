import { ClassPilotPlanner } from "@/src/features/planner/ClassPilotPlanner";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getScheduleSlots } from "@/src/lib/db/schedule-repository";
import { listRoster } from "@/src/lib/db/students-repository";
import { findUpcomingBirthdays } from "@/src/features/students/birthdays";

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
  const db = getClassPilotDatabase();
  const plannerData = getClassPilotPlannerData();
  const scheduleSlots = getScheduleSlots(db, plannerData.schoolYear.id);
  const upcomingBirthdays = findUpcomingBirthdays(listRoster(db, plannerData.schoolYear.id));
  const view = params.view === "week" ? "week" : "day";
  const selectedDate = params.date ?? "2026-09-11";

  return (
    <ClassPilotPlanner
      data={plannerData}
      scheduleSlots={scheduleSlots}
      selectedDate={selectedDate}
      upcomingBirthdays={upcomingBirthdays}
      view={view}
    />
  );
}
