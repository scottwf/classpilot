import { NextResponse } from "next/server";
import { getAllLessons } from "@/src/features/planner/lesson-queries";
import { verifyCalendarToken } from "@/src/lib/auth/secrets";
import {
  buildClassScheduleIcsCalendar,
  buildDayCycleIcsCalendar,
  buildIcsCalendar,
} from "@/src/lib/calendar/ics";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getScheduleSlots } from "@/src/lib/db/schedule-repository";
import { getSoleUser } from "@/src/lib/db/users-repository";

export const dynamic = "force-dynamic";

const feedKinds = ["lessons", "day-cycle", "supervision", "all-classes"] as const;
type FeedKind = (typeof feedKinds)[number];

function isFeedKind(value: string): value is FeedKind {
  return (feedKinds as readonly string[]).includes(value);
}

// Token-gated, not requireAuth()-gated: calendar apps subscribing by URL
// can't follow a login redirect or hold a session cookie. See
// getCalendarToken()/verifyCalendarToken() in src/lib/auth/secrets.ts. The
// shared token has no user identity embedded (issue #21 didn't scope this
// -- only MCP tokens are becoming per-user in Phase 4), so this resolves
// to the sole existing user. Fine while the app is still effectively
// single-user; revisit if a second real account needs its own feed.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const kindParam = url.searchParams.get("kind") ?? "lessons";

  if (!token || !verifyCalendarToken(token)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!isFeedKind(kindParam)) {
    return new NextResponse("Unknown feed kind", { status: 400 });
  }

  const user = getSoleUser(getClassPilotDatabase());

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const db = getClassPilotDatabase();
  const plannerData = getClassPilotPlannerData(user.id);
  const ics = buildFeed(kindParam, db, user.id, plannerData);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="classpilot.ics"',
      "Cache-Control": "no-store",
    },
  });
}

function buildFeed(
  kind: FeedKind,
  db: ReturnType<typeof getClassPilotDatabase>,
  userId: string,
  plannerData: ReturnType<typeof getClassPilotPlannerData>,
) {
  const yearTitle = plannerData.schoolYear.title;

  if (kind === "lessons") {
    return buildIcsCalendar({
      calendarName: `ClassPilot — ${yearTitle}`,
      lessons: getAllLessons(plannerData),
    });
  }

  if (kind === "day-cycle") {
    return buildDayCycleIcsCalendar({
      calendarName: `ClassPilot Day Cycle — ${yearTitle}`,
      schoolYear: plannerData.schoolYear,
    });
  }

  const scheduleSlots = getScheduleSlots(db, userId, plannerData.schoolYear.id);

  if (kind === "supervision") {
    return buildClassScheduleIcsCalendar({
      calendarName: `ClassPilot Supervision — ${yearTitle}`,
      classes: plannerData.classes,
      instructionalOnly: false,
      scheduleSlots,
      schoolYear: plannerData.schoolYear,
    });
  }

  return buildClassScheduleIcsCalendar({
    calendarName: `ClassPilot All Classes — ${yearTitle}`,
    classes: plannerData.classes,
    scheduleSlots,
    schoolYear: plannerData.schoolYear,
  });
}
