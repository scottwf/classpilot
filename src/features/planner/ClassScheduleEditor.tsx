"use client";

import { useMemo, useState } from "react";
import { getDayLabel } from "./cycle";
import type { ClassColor, DayLabelScheme, ScheduleSlot } from "./types";

type DayTime = { startTime: string; endTime: string };

type ClassScheduleEditorProps = {
  classId: string;
  className: string;
  color: ClassColor;
  cycleLength: number;
  dayLabelScheme: DayLabelScheme;
  initialSlots: ScheduleSlot[];
  /** Name of the hidden input carrying the built [{cycleDay, startTime,
   * endTime}, ...] list as JSON, for the surrounding <form> to submit. */
  hiddenInputName: string;
};

const inputClass =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

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

/**
 * "Click a class, check off which days it meets and set a start/end time
 * per day" editor — matches ClassForm's existing day-cycle checkbox
 * pattern, extended with per-day time fields since classes no longer share
 * a school-wide "period" (see task #24 / ClassScheduleEditor decision).
 */
export function ClassScheduleEditor({
  classId,
  className,
  color,
  cycleLength,
  dayLabelScheme,
  initialSlots,
  hiddenInputName,
}: ClassScheduleEditorProps) {
  const [days, setDays] = useState<Map<number, DayTime>>(
    () => new Map(initialSlots.map((slot) => [slot.cycleDay, slot])),
  );

  const cycleDayNumbers = Array.from({ length: cycleLength }, (_, index) => index + 1);

  const slotsJson = useMemo(() => {
    const slots = Array.from(days.entries())
      .filter(([, time]) => time.startTime && time.endTime)
      .map(([cycleDay, time]) => ({
        cycleDay,
        startTime: time.startTime,
        endTime: time.endTime,
      }));
    return JSON.stringify(slots);
  }, [days]);

  function toggleDay(cycleDay: number, checked: boolean) {
    setDays((previous) => {
      const next = new Map(previous);
      if (checked) {
        next.set(cycleDay, previous.get(cycleDay) ?? { startTime: "", endTime: "" });
      } else {
        next.delete(cycleDay);
      }
      return next;
    });
  }

  function setDayTime(cycleDay: number, field: keyof DayTime, value: string) {
    setDays((previous) => {
      const next = new Map(previous);
      const current = next.get(cycleDay) ?? { startTime: "", endTime: "" };
      next.set(cycleDay, { ...current, [field]: value });
      return next;
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <input name={hiddenInputName} type="hidden" value={slotsJson} />
      <input name="classId" type="hidden" value={classId} />

      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`size-2.5 shrink-0 rounded-full ${classDotColorClass[color]}`}
        />
        <h3 className="text-sm font-semibold text-slate-950">{className}</h3>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Check each day this class meets and set its start/end time. Saving
        replaces this class&apos;s whole schedule.
      </p>

      <div className="mt-3 space-y-2">
        {cycleDayNumbers.map((cycleDay) => {
          const time = days.get(cycleDay);
          const checked = time !== undefined;

          return (
            <div className="flex flex-wrap items-center gap-2" key={cycleDay}>
              <label className="flex w-32 shrink-0 items-center gap-2 text-sm text-slate-700">
                <input
                  checked={checked}
                  onChange={(event) => toggleDay(cycleDay, event.target.checked)}
                  type="checkbox"
                />
                {getDayLabel(dayLabelScheme, cycleDay)}
              </label>
              {checked ? (
                <>
                  <input
                    className={inputClass}
                    onChange={(event) => setDayTime(cycleDay, "startTime", event.target.value)}
                    required
                    type="time"
                    value={time.startTime}
                  />
                  <span className="text-sm text-slate-400">–</span>
                  <input
                    className={inputClass}
                    onChange={(event) => setDayTime(cycleDay, "endTime", event.target.value)}
                    required
                    type="time"
                    value={time.endTime}
                  />
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
        type="submit"
      >
        Save {className}&apos;s schedule
      </button>
    </div>
  );
}
