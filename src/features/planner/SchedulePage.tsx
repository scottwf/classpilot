"use client";

import Link from "next/link";
import { useState } from "react";
import { ClassScheduleEditor } from "./ClassScheduleEditor";
import { getDayLabel } from "./cycle";
import type { ClassColor, ClassSection, DayLabelScheme, ScheduleSlot } from "./types";

type ServerAction = (formData: FormData) => void | Promise<void>;

type SchedulePageProps = {
  action: ServerAction;
  classes: ClassSection[];
  conflictClassId?: string;
  conflictClassName?: string;
  cycleLength: number;
  dayLabelScheme: DayLabelScheme;
  error?: string;
  scheduleSlots: ScheduleSlot[];
  /** True when arriving from the school-year onboarding wizard — shows a
   * banner and a "Continue to review" link. See app/onboarding/. */
  wizardMode?: boolean;
};

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

const classDotColorClass: Record<ClassColor, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
};

export function SchedulePage({
  action,
  classes,
  conflictClassId,
  conflictClassName,
  cycleLength,
  dayLabelScheme,
  error,
  scheduleSlots,
  wizardMode,
}: SchedulePageProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(conflictClassId);

  const cycleDayNumbers = Array.from({ length: cycleLength }, (_, index) => index + 1);
  const classById = new Map(classes.map((classSection) => [classSection.id, classSection]));
  const selectedClass = selectedClassId ? classById.get(selectedClassId) : undefined;
  const selectedClassSlots = selectedClassId
    ? scheduleSlots.filter((slot) => slot.classId === selectedClassId)
    : [];

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
          Please check the form and try again.
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
                            className={`block w-full rounded-md px-2 py-1.5 text-left text-xs ${classBlockColorClass[classSection.color]}`}
                            key={slot.id}
                            onClick={() => setSelectedClassId(classSection.id)}
                            type="button"
                          >
                            <div className="font-medium">{classSection.name}</div>
                            <div className="opacity-80">
                              {slot.startTime}–{slot.endTime}
                            </div>
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
              {classes.map((classSection) => (
                <li key={classSection.id}>
                  <button
                    className={[
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                      selectedClassId === classSection.id
                        ? "bg-blue-50 text-blue-900"
                        : "text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                    onClick={() => setSelectedClassId(classSection.id)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={`size-2.5 shrink-0 rounded-full ${classDotColorClass[classSection.color]}`}
                    />
                    {classSection.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {selectedClass ? (
        <form action={action}>
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
      ) : null}
    </>
  );
}
