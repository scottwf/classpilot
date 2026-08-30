import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { toCsv } from "@/src/lib/csv";

export const dynamic = "force-dynamic";

/**
 * A single-row CSV of the active school year's own settings (dates, cycle
 * length, day-label scheme) -- for carrying calendar setup across a
 * planner-data reset (see /settings for "Reset all planner data") instead
 * of re-entering it by hand. Paired with blocked-dates.csv for the actual
 * non-instructional days.
 */
export async function GET() {
  const userId = await requireAuth();
  const { schoolYear } = getClassPilotPlannerData(userId);

  const csv = toCsv(
    ["title", "startDate", "endDate", "cycleLength", "dayLabelScheme"],
    [
      [
        schoolYear.title,
        schoolYear.startDate,
        schoolYear.endDate,
        String(schoolYear.cycleLength),
        schoolYear.dayLabelScheme,
      ],
    ],
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="school-year.csv"',
      "Cache-Control": "no-store",
    },
  });
}
