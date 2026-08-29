import { ClassPilotPlanner } from "@/src/features/planner/ClassPilotPlanner";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { listDayNotes } from "@/src/lib/db/day-notes-repository";
import { getScheduleExceptions } from "@/src/lib/db/schedule-exceptions-repository";
import { getScheduleSlots } from "@/src/lib/db/schedule-repository";
import { listRoster } from "@/src/lib/db/students-repository";
import { findUpcomingBirthdays } from "@/src/features/students/birthdays";
import {
  getAllLessons,
  getWeekdayDates,
  resolvePlanBookDefaultDate,
} from "@/src/features/planner/lesson-queries";
import { cancelClassMeetingAction, restoreClassMeetingAction, saveDayNoteAction } from "./actions";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    date?: string;
    view?: string;
    month?: string;
    notice?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const userId = await requireAuth();

  const params = await searchParams;
  const db = getClassPilotDatabase();
  const plannerData = getClassPilotPlannerData(userId);
  const scheduleSlots = getScheduleSlots(db, userId, plannerData.schoolYear.id);
  const scheduleExceptions = getScheduleExceptions(db, userId, plannerData.schoolYear.id);
  const upcomingBirthdays = findUpcomingBirthdays(
    listRoster(db, userId, plannerData.schoolYear.id),
  );
  const view = params.view === "week" ? "week" : "day";
  const todayKey = new Date().toISOString().slice(0, 10);
  const selectedDate =
    params.date ??
    resolvePlanBookDefaultDate(
      plannerData.schoolYear,
      getAllLessons(plannerData)
        .map((lesson) => lesson.date)
        .filter((date): date is string => date !== null),
      todayKey,
    );
  const noteDates = view === "week" ? getWeekdayDates(selectedDate) : [selectedDate];
  const dayNotes = listDayNotes(db, userId, plannerData.schoolYear.id, noteDates);

  return (
    <ClassPilotPlanner
      calendarMonth={params.month}
      cancelClassMeetingAction={cancelClassMeetingAction}
      data={plannerData}
      dayNotes={dayNotes}
      notice={params.notice}
      restoreClassMeetingAction={restoreClassMeetingAction}
      saveDayNoteAction={saveDayNoteAction}
      scheduleExceptions={scheduleExceptions}
      scheduleSlots={scheduleSlots}
      selectedDate={selectedDate}
      todayDate={todayKey}
      upcomingBirthdays={upcomingBirthdays}
      view={view}
    />
  );
}
