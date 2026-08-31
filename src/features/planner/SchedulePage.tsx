"use client";

import Link from "next/link";
import { useState } from "react";
import { ClassScheduleEditor } from "./ClassScheduleEditor";
import { getDayLabel } from "./cycle";
import { formatMinutes, type ClassInstructionalTime } from "./instructional-time";
import { getClassBlockColorClass, getClassDotColorClass } from "./class-color";
import type { ClassSection, DayLabelScheme, ScheduleSlot } from "./types";

type ServerAction = (formData: FormData) => void | Promise<void>;

type SchedulePageProps = {
  action: ServerAction;
  addTemporaryAction: ServerAction;
  classes: ClassSection[];
  conflictClassId?: string;
  conflictClassName?: string;
  cycleLength: number;
  dayLabelScheme: DayLabelScheme;
  deleteTemporaryAction: ServerAction;
  error?: string;
  /** Scheduled-vs-target instructional minutes per class, for the whole
   * school year — see instructional-time.ts. */
  instructionalTime: ClassInstructionalTime[];
  scheduleSlots: ScheduleSlot[];
  swapNotice?: string;
  temporaryAdded?: boolean;
  /** True when arriving from the school-year onboarding wizard — shows a
   * banner and a "Continue to review" link. See app/onboarding/. */
  wizardMode?: boolean;
};

export function SchedulePage({
  action,
  addTemporaryAction,
  classes,
  conflictClassId,
  conflictClassName,
  cycleLength,
  dayLabelScheme,
  deleteTemporaryAction,
  error,
  instructionalTime,
  scheduleSlots,
  swapNotice,
  temporaryAdded,
  wizardMode,
}: SchedulePageProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(conflictClassId);

  const cycleDayNumbers = Array.from({ length: cycleLength }, (_, index) => index + 1);
  const classById = new Map(classes.map((classSection) => [classSection.id, classSection]));
  const timeByClassId = new Map(instructionalTime.map((entry) => [entry.classId, entry]));
  const temporarySlots = scheduleSlots.filter((slot) => slot.startDate);
  const selectedClass = selectedClassId ? classById.get(selectedClassId) : undefined;
  // Only the class's regular (non-dated) slots — temporary/burst slots are
  // managed separately below and would otherwise get pulled into this
  // editor's map and accidentally persisted as regular slots on save.
  const selectedClassSlots = selectedClassId
    ? scheduleSlots.filter((slot) => slot.classId === selectedClassId && !slot.startDate)
    : [];
  const selectedClassTime = selectedClassId ? timeByClassId.get(selectedClassId) : undefined;

  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">Schedule</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Class timetable.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          See every class across all {cycleLength} cycle days at once. Click
          a class below to set which days it meets and at what times —
          saving replaces that class&apos;s whole schedule.
        </p>
        <a
          className="mt-2 inline-block text-sm font-medium text-blue-700 underline"
          href="/settings/schedule/timetable.csv"
        >
          Download timetable (CSV) — for carrying it across a &quot;Reset
          all planner data&quot;
        </a>
      </section>

      {wizardMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-800">
            Click each class below and set the days/times it meets, then
            continue to review your instructional time.
          </p>
          <Link
            className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm"
            href="/onboarding/review"
          >
            Continue to review
          </Link>
        </div>
      ) : null}

      {conflictClassName ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This schedule now overlaps with {conflictClassName} on at least one
          day. Both are saved — double-check that&apos;s intentional.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error === "temporary"
            ? "Please check the temporary schedule form — a class, cycle day, valid times, and a valid date range are all required."
            : "Please check the form and try again."}
        </div>
      ) : null}

      {swapNotice ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {swapNotice}
        </div>
      ) : null}

      {temporaryAdded ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Temporary schedule added.
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          {classes.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              No classes yet. Add classes from Settings, then come back here
              to schedule them.
            </p>
          ) : (
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${cycleLength}, minmax(0, 1fr))` }}
            >
              {cycleDayNumbers.map((day) => {
                const daySlots = scheduleSlots
                  .filter((slot) => slot.cycleDay === day)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                return (
                  <div key={day}>
                    <div className="text-center text-xs font-semibold uppercase text-slate-500">
                      {getDayLabel(dayLabelScheme, day)}
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {daySlots.map((slot) => {
                        const classSection = classById.get(slot.classId);
                        if (!classSection) {
                          return null;
                        }

                        return (
                          <button
                            className={`block w-full rounded-md px-2 py-1.5 text-left text-xs ${getClassBlockColorClass(classSection.color)}`}
                            key={slot.id}
                            onClick={() => setSelectedClassId(classSection.id)}
                            type="button"
                          >
                            <div className="font-medium">{classSection.name}</div>
                            <div className="opacity-80">
                              {slot.startTime}–{slot.endTime}
                            </div>
                            {slot.startDate ? (
                              <div className="mt-0.5 opacity-70">
                                Temporary: {slot.startDate} – {slot.endDate}
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                      {daySlots.length === 0 ? (
                        <div className="rounded-md border border-dashed border-slate-200 px-2 py-3 text-center text-xs text-slate-300">
                          —
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">Classes</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Click a class to set its schedule.
            </p>
            <ul className="mt-3 space-y-1">
              {classes.map((classSection) => {
                const time = timeByClassId.get(classSection.id);

                return (
                  <li key={classSection.id}>
                    <button
                      className={[
                        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                        selectedClassId === classSection.id
                          ? "bg-blue-50 text-blue-900"
                          : "text-slate-700 hover:bg-slate-100",
                      ].join(" ")}
                      onClick={() => setSelectedClassId(classSection.id)}
                      type="button"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`size-2.5 shrink-0 rounded-full ${getClassDotColorClass(classSection.color)}`}
                        />
                        {classSection.name}
                      </span>
                      {time && time.scheduledMinutes > 0 ? (
                        <span
                          className={[
                            "shrink-0 text-xs font-medium",
                            time.meetsTarget ? "text-emerald-700" : "text-amber-700",
                          ].join(" ")}
                        >
                          {formatMinutes(time.scheduledMinutes)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>

      {selectedClass ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <form action={action} key={selectedClass.id}>
            {wizardMode ? <input name="wizard" type="hidden" value="1" /> : null}
            <ClassScheduleEditor
              classId={selectedClass.id}
              className={selectedClass.name}
              color={selectedClass.color}
              cycleLength={cycleLength}
              dayLabelScheme={dayLabelScheme}
              hiddenInputName="slotsJson"
              initialSlots={selectedClassSlots}
            />
          </form>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">Instructional time</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Computed from the days/times saved below, times how often each
              day actually occurs across the school year.
            </p>
            <div className="mt-3 text-2xl font-semibold text-slate-950">
              {formatMinutes(selectedClassTime?.scheduledMinutes ?? 0)}
            </div>
            {selectedClass.targetMinutesPerYear ? (
              <div
                className={[
                  "mt-1 text-xs font-medium",
                  selectedClassTime?.meetsTarget ? "text-emerald-700" : "text-amber-700",
                ].join(" ")}
              >
                {selectedClassTime?.meetsTarget ? "Meets" : "Under"} target (
                {formatMinutes(selectedClass.targetMinutesPerYear)})
              </div>
            ) : (
              <div className="mt-1 text-xs text-slate-400">
                No target set —{" "}
                <Link className="underline" href={`/classes/${selectedClass.id}/edit`}>
                  add one
                </Link>
                .
              </div>
            )}
          </aside>
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">
          Temporary schedule (burst-taught classes)
        </h3>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
          For a class taught in a burst instead of at a steady cycle
          interval — e.g. Career Ed daily for two weeks instead of once
          every {cycleLength} days. This adds a slot alongside the class&apos;s
          regular schedule, only active between the dates you set. If it
          overlaps another class&apos;s regular slot, that&apos;s treated as an
          intentional swap: any lessons that class already had planned in
          the window get pushed forward automatically, extending its unit
          as needed — you&apos;ll see a summary after saving.
        </p>

        {temporarySlots.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {temporarySlots.map((slot) => {
              const classSection = classById.get(slot.classId);

              return (
                <li
                  className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                  key={slot.id}
                >
                  <div className="flex items-center gap-2">
                    {classSection ? (
                      <span
                        aria-hidden="true"
                        className={`size-2.5 shrink-0 rounded-full ${getClassDotColorClass(classSection.color)}`}
                      />
                    ) : null}
                    <span className="font-medium text-slate-950">
                      {classSection?.name ?? "Unknown class"}
                    </span>
                    <span className="text-slate-500">
                      {getDayLabel(dayLabelScheme, slot.cycleDay)}, {slot.startTime}–{slot.endTime}
                    </span>
                    <span className="text-slate-400">
                      {slot.startDate} – {slot.endDate}
                    </span>
                  </div>
                  <form action={deleteTemporaryAction}>
                    <input name="slotId" type="hidden" value={slot.id} />
                    <button
                      className="text-xs font-medium text-slate-400 hover:text-rose-600"
                      type="submit"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : null}

        <form action={addTemporaryAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Class</span>
            <select
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              name="classId"
              required
            >
              {classes.map((classSection) => (
                <option key={classSection.id} value={classSection.id}>
                  {classSection.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Cycle day</span>
            <select
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              name="cycleDay"
              required
            >
              {cycleDayNumbers.map((day) => (
                <option key={day} value={day}>
                  {getDayLabel(dayLabelScheme, day)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <label className="block flex-1 text-sm">
              <span className="font-medium text-slate-700">Start time</span>
              <input
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                name="startTime"
                required
                type="time"
              />
            </label>
            <label className="block flex-1 text-sm">
              <span className="font-medium text-slate-700">End time</span>
              <input
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                name="endTime"
                required
                type="time"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">From date</span>
            <input
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              name="startDate"
              required
              type="date"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">To date</span>
            <input
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
              name="endDate"
              required
              type="date"
            />
          </label>

          <div className="flex items-end">
            <button
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
              type="submit"
            >
              Add temporary schedule
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
