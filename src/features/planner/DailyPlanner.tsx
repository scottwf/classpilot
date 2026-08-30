import Link from "next/link";
import { CalendarDays, CalendarX, Clock3, NotebookPen, Plus, Undo2 } from "lucide-react";
import type { DayInfo } from "./cycle";
import type { AgendaEntry } from "./day-agenda";
import type { EnrichedLesson } from "./lesson-queries";
import type { ClassColor, ClassSection } from "./types";

type DayColumn = {
  date: string;
  entries: AgendaEntry[];
};

type DailyPlannerProps = {
  cancelClassMeetingAction?: (formData: FormData) => void | Promise<void>;
  /** Every class, for the "cancel and swap in" dropdown -- not just the
   * ones scheduled today. */
  classes?: ClassSection[];
  date: string;
  view: "day" | "week";
  days: DayColumn[];
  dayInfoByDate?: Record<string, DayInfo | undefined>;
  dayNotes?: Record<string, string>;
  restoreClassMeetingAction?: (formData: FormData) => void | Promise<void>;
  saveDayNoteAction?: (formData: FormData) => void | Promise<void>;
  schoolYearId?: string;
  /** Lessons in the shown date range that aren't tied to a scheduled slot
   * (e.g. the class has no schedule set up yet, or a lesson was added on
   * an ad-hoc day) — shown separately so nothing existing gets hidden. */
  otherLessons: EnrichedLesson[];
};

const dayInfoBadgeClass: Record<DayInfo["kind"], string> = {
  instructional: "bg-blue-100 text-blue-800",
  blocked: "bg-amber-100 text-amber-800",
  weekend: "bg-slate-100 text-slate-500",
};

function DayInfoBadge({ info }: { info: DayInfo | undefined }) {
  if (!info || info.kind === "weekend") {
    return null;
  }

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${dayInfoBadgeClass[info.kind]}`}>
      {info.label}
    </span>
  );
}

const classBlockColorClass: Record<ClassColor, string> = {
  amber: "bg-amber-100 text-amber-950",
  blue: "bg-blue-100 text-blue-950",
  emerald: "bg-emerald-100 text-emerald-950",
  orange: "bg-orange-100 text-orange-950",
  rose: "bg-rose-100 text-rose-950",
  sky: "bg-sky-100 text-sky-950",
  teal: "bg-teal-100 text-teal-950",
  violet: "bg-violet-100 text-violet-950",
};

export function DailyPlanner({
  cancelClassMeetingAction,
  classes = [],
  date,
  view,
  days,
  dayInfoByDate = {},
  dayNotes = {},
  otherLessons,
  restoreClassMeetingAction,
  saveDayNoteAction,
  schoolYearId,
}: DailyPlannerProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">
            {view === "day" ? "Today's schedule" : "This week's schedule"}
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-950">
            {view === "day" ? formatDate(date) : `Week of ${formatWeekOf(days[0]?.date ?? date)}`}
            {view === "day" ? <DayInfoBadge info={dayInfoByDate[date]} /> : null}
          </h2>
        </div>
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm"
          href={`/lessons/new?date=${date}`}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add lesson
        </Link>
      </div>

      {view === "day" && saveDayNoteAction && schoolYearId ? (
        <DayNoteForm
          // Keyed by date so navigating to a different day remounts this
          // form instead of reusing the same <textarea> DOM node -- without
          // this, an uncontrolled defaultValue never re-applies, so unsaved
          // text typed for one day would visually "follow" you to the next.
          body={dayNotes[date] ?? ""}
          date={date}
          key={date}
          saveDayNoteAction={saveDayNoteAction}
          schoolYearId={schoolYearId}
          view={view}
        />
      ) : null}

      {view === "day" ? (
        <DayColumnView
          cancelClassMeetingAction={cancelClassMeetingAction}
          classes={classes}
          column={days[0]}
          restoreClassMeetingAction={restoreClassMeetingAction}
          view={view}
        />
      ) : (
        <div
          className="mt-4 grid gap-3"
          style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {days.map((column) => (
            <div key={column.date}>
              <Link
                className="flex items-center justify-center gap-1 text-center text-xs font-semibold uppercase text-slate-500 hover:text-blue-700"
                href={`/?date=${column.date}&view=day`}
              >
                {formatShortDate(column.date)}
                {dayNotes[column.date] ? (
                  <NotebookPen aria-label="Has a note" className="size-3" />
                ) : null}
              </Link>
              <div className="mt-1 flex justify-center">
                <DayInfoBadge info={dayInfoByDate[column.date]} />
              </div>
              <div className="mt-2">
                <DayColumnView
                  cancelClassMeetingAction={cancelClassMeetingAction}
                  classes={classes}
                  column={column}
                  compact
                  restoreClassMeetingAction={restoreClassMeetingAction}
                  view={view}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {otherLessons.length > 0 ? (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-950">
            Other lessons this {view}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Not tied to a scheduled class slot — set up the class&apos;s
            schedule on the Schedule page to have it show above instead.
          </p>
          <div className="mt-3 grid gap-3">
            {otherLessons.map((lesson) => (
              <article
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                key={lesson.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-blue-700">
                      {lesson.className}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-slate-950">
                      <Link className="hover:text-blue-700" href={`/lessons/${lesson.id}`}>
                        {lesson.title}
                      </Link>
                    </h3>
                  </div>
                  <span className="w-fit rounded-md bg-white px-2 py-1 text-xs text-slate-600">
                    {lesson.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{lesson.summary}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays aria-hidden="true" className="size-3.5" />
                    {lesson.date}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 aria-hidden="true" className="size-3.5" />
                    {lesson.durationMinutes} min
                  </span>
                  <span>{lesson.unitTitle}</span>
                  <span>{lesson.outcomeCodes.join(", ")}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DayNoteForm({
  body,
  date,
  saveDayNoteAction,
  schoolYearId,
  view,
}: {
  body: string;
  date: string;
  saveDayNoteAction: (formData: FormData) => void | Promise<void>;
  schoolYearId: string;
  view: string;
}) {
  return (
    <form
      action={saveDayNoteAction}
      className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3"
    >
      <input name="date" type="hidden" value={date} />
      <input name="schoolYearId" type="hidden" value={schoolYearId} />
      <input name="view" type="hidden" value={view} />
      <label className="block">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
          <NotebookPen aria-hidden="true" className="size-3.5" />
          Note for this day
        </span>
        <textarea
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          defaultValue={body}
          name="body"
          placeholder="e.g. PD morning — shortened periods, no Block D"
          rows={2}
        />
      </label>
      <button
        className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
        type="submit"
      >
        Save note
      </button>
    </form>
  );
}

function DayColumnView({
  cancelClassMeetingAction,
  classes = [],
  column,
  compact,
  restoreClassMeetingAction,
  view = "day",
}: {
  cancelClassMeetingAction?: (formData: FormData) => void | Promise<void>;
  classes?: ClassSection[];
  column?: DayColumn;
  compact?: boolean;
  restoreClassMeetingAction?: (formData: FormData) => void | Promise<void>;
  view?: string;
}) {
  if (!column || column.entries.length === 0) {
    return (
      <div
        className={`rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500 ${compact ? "p-3 text-xs" : "mt-4 p-5 text-sm"}`}
      >
        {compact ? "No classes scheduled" : "No classes scheduled for this day. Set up the schedule on the Schedule page, or use Add lesson to plan ahead."}
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-1.5" : "mt-4 space-y-2"}>
      {column.entries.map(
        ({
          slot,
          classSection,
          lesson,
          activeUnitId,
          exception,
          substituteClassSection,
          substituteLesson,
          substituteActiveUnitId,
        }) => {
        // A class swap keeps the original slot time, but it should look
        // like the class now teaching it. This makes the timetable read in
        // the same order a teacher experiences the day.
        const displayedClass = substituteClassSection ?? classSection;
        const isClassSwap = Boolean(exception && substituteClassSection);

        return (
        <div
          className={`rounded-md ${classBlockColorClass[displayedClass.color]} ${compact ? "p-2 text-xs" : "p-3 text-sm"}`}
          key={slot.id}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{displayedClass.name}</span>
            <span className="opacity-70">
              {slot.startTime}–{slot.endTime}
            </span>
          </div>

          {exception ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {isClassSwap ? (
                substituteLesson ? (
                  <Link
                    className="block truncate underline hover:opacity-75"
                    href={`/lessons/${substituteLesson.id}`}
                  >
                    {substituteLesson.title}
                  </Link>
                ) : (
                  <Link
                    className="inline-flex items-center gap-1 underline hover:opacity-75"
                    href={`/lessons/new?date=${column.date}&classId=${exception.substituteClassId}${substituteActiveUnitId ? `&unitId=${substituteActiveUnitId}` : ""}`}
                  >
                    <Plus aria-hidden="true" className="size-3" />
                    Insert lesson
                  </Link>
                )
              ) : (
                <span className="inline-flex items-center gap-1 font-medium">
                  <CalendarX aria-hidden="true" className="size-3" />
                  {exception.label}
                </span>
              )}

              {isClassSwap && exception.label !== displayedClass.name ? (
                <span className="text-xs opacity-70">{exception.label}</span>
              ) : null}

              {restoreClassMeetingAction ? (
                <form action={restoreClassMeetingAction}>
                  <input name="exceptionId" type="hidden" value={exception.id} />
                  <input name="date" type="hidden" value={column.date} />
                  <input name="view" type="hidden" value={view} />
                  <button
                    className="inline-flex items-center gap-1 underline hover:opacity-75"
                    type="submit"
                  >
                    <Undo2 aria-hidden="true" className="size-3" />
                    Restore class
                  </button>
                </form>
              ) : null}
            </div>
          ) : (
            <>
              {lesson ? (
                <Link
                  className="mt-1 block truncate underline hover:opacity-75"
                  href={`/lessons/${lesson.id}`}
                >
                  {lesson.title}
                </Link>
              ) : null}

              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Link
                  className="inline-flex items-center gap-1 rounded border border-current/25 px-1.5 py-0.5 text-xs font-medium opacity-80 hover:opacity-100"
                  href={`/lessons/new?date=${column.date}&classId=${classSection.id}${activeUnitId ? `&unitId=${activeUnitId}` : ""}`}
                >
                  <Plus aria-hidden="true" className="size-3" />
                  Add lesson
                </Link>

                {cancelClassMeetingAction ? (
                  // Collapsed by default (<details>, no client JS needed) --
                  // swapping/cancelling a class is rare, so it shouldn't
                  // cost a permanently-visible row on every single slot.
                  <details className="[&_summary::-webkit-details-marker]:hidden">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded border border-current/25 px-1.5 py-0.5 text-xs font-medium opacity-80 hover:opacity-100">
                      <CalendarX aria-hidden="true" className="size-3" />
                      Swap / cancel
                    </summary>
                    <form
                      action={cancelClassMeetingAction}
                      className="mt-1.5 flex flex-wrap items-center gap-1"
                    >
                      <input name="classId" type="hidden" value={classSection.id} />
                      <input name="date" type="hidden" value={column.date} />
                      <input name="view" type="hidden" value={view} />
                      <select
                        aria-label="Swap in another class instead"
                        className="min-w-0 rounded border border-transparent bg-white/60 px-1 py-0.5 text-xs outline-none focus:border-current"
                        defaultValue=""
                        name="substituteClassId"
                      >
                        <option value="">No substitute</option>
                        {classes
                          .filter((otherClass) => otherClass.id !== classSection.id)
                          .map((otherClass) => (
                            <option key={otherClass.id} value={otherClass.id}>
                              {otherClass.name}
                            </option>
                          ))}
                      </select>
                      <input
                        aria-label="Custom label (optional)"
                        className="min-w-0 flex-1 rounded border border-transparent bg-white/60 px-1 py-0.5 text-xs outline-none placeholder:opacity-60 focus:border-current"
                        name="label"
                        placeholder="Optional label"
                        type="text"
                      />
                      <button
                        className="shrink-0 rounded border border-current/25 px-1.5 py-0.5 text-xs font-medium opacity-80 hover:opacity-100"
                        type="submit"
                      >
                        Cancel
                      </button>
                    </form>
                  </details>
                ) : null}
              </div>
            </>
          )}
        </div>
        );
      },
      )}
    </div>
  );
}

function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

function formatWeekOf(dateKey: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}
