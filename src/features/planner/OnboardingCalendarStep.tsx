"use client";

import { useMemo, useState } from "react";
import { buildCycleDayMap, getDayLabel } from "./cycle";
import { buildMonthGrids } from "./onboarding-calendar";
import type { DayLabelScheme, NonInstructionalDay } from "./types";

type OnboardingCalendarStepProps = {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const quickLabels = ["Holiday", "PD Day", "Parent-Teacher Conferences", "Prep Day"];

const weekdayHeadings = ["S", "M", "T", "W", "T", "F", "S"];

export function OnboardingCalendarStep({ action, error }: OnboardingCalendarStepProps) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cycleLength, setCycleLength] = useState(5);
  const [dayLabelScheme, setDayLabelScheme] = useState<DayLabelScheme>("numeric");
  const [blockedDates, setBlockedDates] = useState<Map<string, NonInstructionalDay>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string | undefined>();

  const blockedDatesList = useMemo(() => Array.from(blockedDates.values()), [blockedDates]);

  const cycleDayMap = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) {
      return new Map<string, number>();
    }
    return buildCycleDayMap({
      startDate,
      endDate,
      cycleLength,
      blockedDates: blockedDatesList,
    });
  }, [startDate, endDate, cycleLength, blockedDatesList]);

  const monthGrids = useMemo(() => buildMonthGrids(startDate, endDate), [startDate, endDate]);

  function setDayBlocked(date: string, label: string, advancesCycle: boolean) {
    setBlockedDates((previous) => {
      const next = new Map(previous);
      next.set(date, { date, label, advancesCycle });
      return next;
    });
  }

  function clearDay(date: string) {
    setBlockedDates((previous) => {
      const next = new Map(previous);
      next.delete(date);
      return next;
    });
  }

  const selectedEntry = selectedDate ? blockedDates.get(selectedDate) : undefined;

  return (
    <form action={action} className="space-y-5">
      <input
        name="blockedDatesJson"
        type="hidden"
        value={JSON.stringify(blockedDatesList)}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Title</span>
            <input
              className={inputClass}
              name="title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. 2027-2028 Grade 6 Homeroom"
              required
              value={title}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Start date</span>
              <input
                className={inputClass}
                name="startDate"
                onChange={(event) => setStartDate(event.target.value)}
                required
                type="date"
                value={startDate}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">End date</span>
              <input
                className={inputClass}
                name="endDate"
                onChange={(event) => setEndDate(event.target.value)}
                required
                type="date"
                value={endDate}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Day cycle length</span>
              <input
                className={inputClass}
                min={1}
                name="cycleLength"
                onChange={(event) => setCycleLength(Number(event.target.value) || 1)}
                required
                step={1}
                type="number"
                value={cycleLength}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Cycle day labels</span>
              <select
                className={inputClass}
                name="dayLabelScheme"
                onChange={(event) => setDayLabelScheme(event.target.value as DayLabelScheme)}
                value={dayLabelScheme}
              >
                <option value="numeric">Numeric — Day 1, Day 2...</option>
                <option value="letters">Letters — Day A, Day B...</option>
                <option value="odd-even">Odd/Even — for a 2-day cycle</option>
              </select>
            </label>
          </div>

          {error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            type="submit"
          >
            Continue
          </button>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">
              Instructional days
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">
              {cycleDayMap.size}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Updates as you set dates and mark days on the calendar.
            </p>
          </div>

          {selectedDate ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-950">{selectedDate}</h4>
                <button
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                  onClick={() => setSelectedDate(undefined)}
                  type="button"
                >
                  Close
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickLabels.map((label) => (
                  <button
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    key={label}
                    onClick={() => setDayBlocked(selectedDate, label, true)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="mt-3 block text-xs">
                <span className="font-medium text-slate-700">Custom label</span>
                <input
                  className={inputClass}
                  onChange={(event) =>
                    setDayBlocked(
                      selectedDate,
                      event.target.value,
                      selectedEntry?.advancesCycle ?? true,
                    )
                  }
                  placeholder="e.g. Winter Break"
                  value={selectedEntry?.label ?? ""}
                />
              </label>

              {selectedEntry ? (
                <>
                  <label className="mt-2 flex items-center gap-2 text-xs text-slate-700">
                    <input
                      checked={selectedEntry.advancesCycle}
                      onChange={(event) =>
                        setDayBlocked(selectedDate, selectedEntry.label, event.target.checked)
                      }
                      type="checkbox"
                    />
                    Advances the day cycle
                  </label>
                  <button
                    className="mt-2 text-xs font-medium text-rose-600 hover:text-rose-800"
                    onClick={() => clearDay(selectedDate)}
                    type="button"
                  >
                    Clear (instructional day)
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-xs leading-5 text-slate-500">
              Click a day on the calendar to mark it as a holiday, PD day, or
              other non-instructional day.
            </div>
          )}
        </aside>
      </div>

      {monthGrids.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {monthGrids.map((grid) => (
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm" key={grid.label}>
              <div className="text-sm font-semibold text-slate-950">{grid.label}</div>
              <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[0.65rem] text-slate-400">
                {weekdayHeadings.map((heading, index) => (
                  <div key={index}>{heading}</div>
                ))}
              </div>
              <div className="mt-1 space-y-1">
                {grid.weeks.map((week, weekIndex) => (
                  <div className="grid grid-cols-7 gap-1" key={weekIndex}>
                    {week.map((cell, cellIndex) => {
                      if (!cell) {
                        return <div key={cellIndex} />;
                      }

                      const blocked = blockedDates.get(cell.date);
                      const cycleDay = cycleDayMap.get(cell.date);
                      const clickable = cell.inRange && !cell.isWeekend;

                      return (
                        <button
                          className={[
                            "flex h-11 flex-col items-center justify-center rounded-md px-0.5 text-[0.6rem] leading-tight",
                            !clickable
                              ? "text-slate-300"
                              : blocked
                                ? "bg-amber-100 font-medium text-amber-900"
                                : selectedDate === cell.date
                                  ? "bg-blue-100 text-blue-900 ring-2 ring-blue-400"
                                  : "text-slate-700 hover:bg-slate-100",
                          ].join(" ")}
                          disabled={!clickable}
                          key={cell.date}
                          onClick={() => setSelectedDate(cell.date)}
                          title={blocked?.label}
                          type="button"
                        >
                          <span className="text-xs">{Number(cell.date.slice(-2))}</span>
                          {clickable && !blocked && cycleDay ? (
                            <span className="truncate text-slate-400">
                              {getDayLabel(dayLabelScheme, cycleDay)}
                            </span>
                          ) : null}
                          {blocked ? (
                            <span className="w-full truncate px-0.5">
                              {blocked.label || "Off"}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </form>
  );
}
