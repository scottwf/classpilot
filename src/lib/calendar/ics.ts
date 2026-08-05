import type { EnrichedLesson } from "@/src/features/planner/lesson-queries";

const FOLD_LIMIT = 75;

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
  const dtstamp = toIcsTimestamp(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClassPilot//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${icsEscape(calendarName)}`),
  ];

  for (const lesson of lessons) {
    lines.push(...buildEvent(lesson, dtstamp));
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}

function buildEvent(lesson: EnrichedLesson, dtstamp: string): string[] {
  const dtstart = lesson.date.replace(/-/g, "");
  const dtend = toIcsDateKey(addDays(lesson.date, 1));
  const description = [
    `Unit: ${lesson.unitTitle}`,
    `Status: ${lesson.status}`,
    "",
    lesson.summary,
  ].join("\n");

  return [
    "BEGIN:VEVENT",
    `UID:${lesson.id}@classpilot`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    foldLine(`SUMMARY:${icsEscape(`${lesson.subject}: ${lesson.title}`)}`),
    foldLine(`DESCRIPTION:${icsEscape(description)}`),
    "END:VEVENT",
  ];
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
