import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { toCsv } from "@/src/lib/csv";

export const dynamic = "force-dynamic";

/**
 * One row per non-instructional day (holidays, PD days, etc.) on the
 * active school year -- see school-year.csv for why this exists.
 */
export async function GET() {
  const userId = await requireAuth();
  const { schoolYear } = getClassPilotPlannerData(userId);

  const csv = toCsv(
    ["date", "label", "advancesCycle"],
    schoolYear.blockedDates
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((day) => [day.date, day.label, String(day.advancesCycle)]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="blocked-dates.csv"',
      "Cache-Control": "no-store",
    },
  });
}
