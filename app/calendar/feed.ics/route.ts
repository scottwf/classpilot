import { NextResponse } from "next/server";
import { getAllLessons } from "@/src/features/planner/lesson-queries";
import { verifyCalendarToken } from "@/src/lib/auth/secrets";
import { buildIcsCalendar } from "@/src/lib/calendar/ics";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";

export const dynamic = "force-dynamic";

// Token-gated, not requireAuth()-gated: calendar apps subscribing by URL
// can't follow a login redirect or hold a session cookie. See
// getCalendarToken()/verifyCalendarToken() in src/lib/auth/secrets.ts.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";

  if (!token || !verifyCalendarToken(token)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const plannerData = getClassPilotPlannerData();
  const lessons = getAllLessons(plannerData);

  const ics = buildIcsCalendar({
    calendarName: `ClassPilot — ${plannerData.schoolYear.title}`,
    lessons,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="classpilot.ics"',
      "Cache-Control": "no-store",
    },
  });
}
