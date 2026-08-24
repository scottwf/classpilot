import { buildCycleDayMap, getDayLabel } from "@/src/features/planner/cycle";
import { buildDayAgenda } from "@/src/features/planner/day-agenda";
import type { EnrichedLesson } from "@/src/features/planner/lesson-queries";
import type { ClassSection, ScheduleSlot, SchoolYear } from "@/src/features/planner/types";

const FOLD_LIMIT = 75;

type IcsEvent = {
  uid: string;
  summary: string;
  description?: string;
} & (
  | { allDay: true; date: string }
  | { allDay: false; date: string; startTime: string; endTime: string }
);

export type BuildIcsCalendarInput = {
  calendarName: string;
  lessons: EnrichedLesson[];
  /** Injectable for tests; defaults to the current time. */
  now?: Date;
};

/**
 * Builds an RFC 5545 ICS feed with one all-day VEVENT per lesson, for
 * read-only "subscribe by URL" use in Apple/Google/Outlook Calendar. Lessons
 * only carry a date (no clock time — class meeting patterns are free text,
 * not structured start/end times), so events are all-day rather than
 * fabricating a time that might be wrong.
 */
export function buildIcsCalendar({
  calendarName,
  lessons,
  now = new Date(),
}: BuildIcsCalendarInput): string {
  // Undated lessons (issue #39) have nothing to put on a calendar.
  const datedLessons = lessons.filter(
    (lesson): lesson is EnrichedLesson & { date: string } => lesson.date !== null,
  );

  return renderCalendar(calendarName, datedLessons.map(lessonToEvent), now);
}

type CalendarFeedSchoolYear = Pick<
  SchoolYear,
  "startDate" | "endDate" | "blockedDates" | "cycleLength" | "dayLabelScheme"
>;

export type BuildDayCycleIcsCalendarInput = {
  calendarName: string;
  schoolYear: CalendarFeedSchoolYear;
  now?: Date;
};

/**
 * One all-day VEVENT per instructional day, labelled with that day's
 * cycle-day label (e.g. "Day 3" / "B Day") per the school year's
 * dayLabelScheme (issue #29) — for subscribing to "what day is it" alone,
 * without any class/lesson detail.
 */
export function buildDayCycleIcsCalendar({
  calendarName,
  schoolYear,
  now = new Date(),
}: BuildDayCycleIcsCalendarInput): string {
  const cycleDayMap = buildCycleDayMap(schoolYear);
  const events: IcsEvent[] = [...cycleDayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cycleDay]) => ({
      uid: `day-cycle-${date}`,
      summary: getDayLabel(schoolYear.dayLabelScheme, cycleDay),
      allDay: true,
      date,
    }));

  return renderCalendar(calendarName, events, now);
}

export type BuildClassScheduleIcsCalendarInput = {
  calendarName: string;
  classes: ClassSection[];
  /** When true, only classes with isInstructional: false are included
   * (the supervision feed); otherwise every scheduled class is (the
   * all-classes feed). */
  instructionalOnly?: boolean;
  scheduleSlots: ScheduleSlot[];
  schoolYear: CalendarFeedSchoolYear;
  now?: Date;
};

/**
 * One timed VEVENT per scheduled class occurrence across the whole school
 * year, reusing buildDayAgenda's existing cycle-day/temporary-slot
 * matching (issue #29) rather than re-deriving it. Powers both the
 * supervision-only feed (instructionalOnly: false, since supervision
 * blocks are the classes with isInstructional: false) and the all-classes
 * feed (no filter).
 */
export function buildClassScheduleIcsCalendar({
  calendarName,
  classes,
  instructionalOnly,
  scheduleSlots,
  schoolYear,
  now = new Date(),
}: BuildClassScheduleIcsCalendarInput): string {
  const cycleDayMap = buildCycleDayMap(schoolYear);
  const events: IcsEvent[] = [];

  for (const date of [...cycleDayMap.keys()].sort()) {
    const entries = buildDayAgenda(date, schoolYear, scheduleSlots, classes, []);

    for (const { slot, classSection } of entries) {
      if (instructionalOnly !== undefined && classSection.isInstructional !== instructionalOnly) {
        continue;
      }

      events.push({
        uid: `slot-${slot.id}-${date}`,
        summary: classSection.name,
        allDay: false,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }
  }

  return renderCalendar(calendarName, events, now);
}

function lessonToEvent(lesson: EnrichedLesson & { date: string }): IcsEvent {
  return {
    uid: lesson.id,
    summary: `${lesson.subject}: ${lesson.title}`,
    description: [`Unit: ${lesson.unitTitle}`, `Status: ${lesson.status}`, "", lesson.summary].join(
      "\n",
    ),
    allDay: true,
    date: lesson.date,
  };
}

function renderCalendar(calendarName: string, events: IcsEvent[], now: Date): string {
  const dtstamp = toIcsTimestamp(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClassPilot//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${icsEscape(calendarName)}`),
  ];

  for (const event of events) {
    lines.push(...renderEvent(event, dtstamp));
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}

function renderEvent(event: IcsEvent, dtstamp: string): string[] {
  const lines = ["BEGIN:VEVENT", `UID:${event.uid}@classpilot`, `DTSTAMP:${dtstamp}`];

  if (event.allDay) {
    const dtstart = event.date.replace(/-/g, "");
    const dtend = toIcsDateKey(addDays(event.date, 1));
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`, `DTEND;VALUE=DATE:${dtend}`);
  } else {
    // Floating local time (no Z, no TZID) -- the app doesn't store an IANA
    // timezone per school year, and every real client interprets a
    // floating time as "whatever timezone I'm in," which matches how a
    // teacher enters a class's meeting time.
    const day = event.date.replace(/-/g, "");
    lines.push(
      `DTSTART:${day}T${event.startTime.replace(":", "")}00`,
      `DTEND:${day}T${event.endTime.replace(":", "")}00`,
    );
  }

  lines.push(foldLine(`SUMMARY:${icsEscape(event.summary)}`));

  if (event.description) {
    lines.push(foldLine(`DESCRIPTION:${icsEscape(event.description)}`));
  }

  lines.push("END:VEVENT");

  return lines;
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

// RFC 5545 lines longer than 75 octets must be folded onto continuation
// lines starting with a single space. Character-based (not strict UTF-8
// octet) folding — acceptable for this feed's mostly-ASCII content and
// tolerated by real-world calendar clients.
function foldLine(line: string): string {
  if (line.length <= FOLD_LIMIT) {
    return line;
  }

  const chunks: string[] = [];
  let rest = line;
  let isFirst = true;

  while (rest.length > 0) {
    const size = isFirst ? FOLD_LIMIT : FOLD_LIMIT - 1;
    chunks.push((isFirst ? "" : " ") + rest.slice(0, size));
    rest = rest.slice(size);
    isFirst = false;
  }

  return chunks.join("\r\n");
}

function toIcsTimestamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

function toIcsDateKey(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function addDays(dateKey: string, days: number): Date {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}
