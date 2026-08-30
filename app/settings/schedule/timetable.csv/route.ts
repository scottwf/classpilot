import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getScheduleSlots } from "@/src/lib/db/schedule-repository";
import { toCsv } from "@/src/lib/csv";

export const dynamic = "force-dynamic";

/**
 * One row per schedule slot (a class's meeting time on one cycle day) --
 * for carrying the timetable across a planner-data reset (see /settings
 * for "Reset all planner data") instead of re-entering it by hand.
 * startDate/endDate are blank for a regular, year-long recurring slot;
 * filled in only for a temporary/burst slot (see ScheduleSlot in types.ts).
 */
export async function GET() {
  const userId = await requireAuth();
  const db = getClassPilotDatabase();
  const { schoolYear, classes } = getClassPilotPlannerData(userId);
  const scheduleSlots = getScheduleSlots(db, userId, schoolYear.id);
  const classById = new Map(classes.map((classSection) => [classSection.id, classSection]));

  const rows = scheduleSlots
    .slice()
    .sort((a, b) => a.cycleDay - b.cycleDay || a.startTime.localeCompare(b.startTime))
    .map((slot) => {
      const classSection = classById.get(slot.classId);

      return [
        classSection?.name ?? slot.classId,
        classSection?.subject ?? "",
        classSection?.grade ?? "",
        String(slot.cycleDay),
        slot.startTime,
        slot.endTime,
        slot.startDate ?? "",
        slot.endDate ?? "",
      ];
    });

  const csv = toCsv(
    ["className", "subject", "grade", "cycleDay", "startTime", "endTime", "startDate", "endDate"],
    rows,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="timetable.csv"',
      "Cache-Control": "no-store",
    },
  });
}
