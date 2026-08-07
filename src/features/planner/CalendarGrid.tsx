"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { buildCycleDayMap, getDayLabel } from "./cycle";
import { buildMonthGrids, selectDateRange } from "./onboarding-calendar";
import type { DayLabelScheme, NonInstructionalDay } from "./types";

type CalendarGridProps = {
  startDate: string;
  endDate: string;
  cycleLength: number;
  dayLabelScheme: DayLabelScheme;
  initialBlockedDates: NonInstructionalDay[];
  /** Name of the hidden input this renders carrying the current
   * blockedDates as JSON, for the surrounding <form> to submit. */
  hiddenInputName: string;
  /** Form fields (title/dates/cycle/etc.) rendered in the left column
   * alongside the instructional-day count and day editor. */
  leftColumn: ReactNode;
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const quickLabels = ["Holiday", "PD Day", "Parent-Teacher Conferences", "Prep Day"];

const weekdayHeadings = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Shared click-to-mark year calendar: month grids with cycle-day labels,
 * shift-click range selection, and a side panel to label days as
 * non-instructional. Used by both the onboarding wizard (a brand-new year,
 * nothing saved until the whole form submits) and the Calendar settings
 * page (an existing year, editing its real blockedDates) — the two differ
 * only in `leftColumn` (the surrounding form fields) and where the hidden
 * input's value ends up getting submitted to.
 */
export function CalendarGrid({
  startDate,
  endDate,
  cycleLength,
  dayLabelScheme,
  initialBlockedDates,
  hiddenInputName,
  leftColumn,
}: CalendarGridProps) {
  const [blockedDates, setBlockedDates] = useState<Map<string, NonInstructionalDay>>(
    () => new Map(initialBlockedDates.map((day) => [day.date, day])),
  );
  // anchorDate is the last plain (non-shift) click — shift-clicking a
  // second day selects every clickable day between the anchor and that
  // day, matching the usual file-explorer range-select convention.
  const [anchorDate, setAnchorDate] = useState<string | undefined>();
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

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

  function setDaysBlocked(dates: string[], label: string, advancesCycle: boolean) {
    setBlockedDates((previous) => {
      const next = new Map(previous);
      for (const date of dates) {
        next.set(date, { date, label, advancesCycle });
      }
      return next;
    });
  }

  function clearDays(dates: string[]) {
    setBlockedDates((previous) => {
      const next = new Map(previous);
      for (const date of dates) {
        next.delete(date);
      }
      return next;
    });
  }

  function handleDayClick(date: string, shiftKey: boolean) {
    if (shiftKey && anchorDate) {
      setSelectedDates(selectDateRange(monthGrids, anchorDate, date));
      return;
    }
    setAnchorDate(date);
    setSelectedDates([date]);
  }

  // Representative entry for pre-filling the editor when multiple days are
  // selected with different (or no) existing labels — actions below still
  // apply uniformly to every selected day, not just this one.
  const selectedEntry =
    selectedDates.length > 0 ? blockedDates.get(selectedDates[0]) : undefined;
  const selectionLabel =
    selectedDates.length <= 1
      ? selectedDates[0]
      : `${selectedDates.length} days selected (${selectedDates[0]} – ${selectedDates[selectedDates.length - 1]})`;

  return (
    <>
      <input name={hiddenInputName} type="hidden" value={JSON.stringify(blockedDatesList)} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {leftColumn}

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

          {selectedDates.length > 0 ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-950">{selectionLabel}</h4>
                <button
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                  onClick={() => {
                    setSelectedDates([]);
                    setAnchorDate(undefined);
                  }}
                  type="button"
                >
                  Close
                </button>
              </div>
              {selectedDates.length > 1 ? (
                <p className="mt-1 text-xs text-blue-800">
                  Actions below apply to all {selectedDates.length} selected days.
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickLabels.map((label) => (
                  <button
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    key={label}
                    onClick={() => setDaysBlocked(selectedDates, label, true)}
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
                    setDaysBlocked(
                      selectedDates,
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
                        setDaysBlocked(selectedDates, selectedEntry.label, event.target.checked)
                      }
                      type="checkbox"
                    />
                    Advances the day cycle
                  </label>
                  <button
                    className="mt-2 text-xs font-medium text-rose-600 hover:text-rose-800"
                    onClick={() => clearDays(selectedDates)}
                    type="button"
                  >
                    Clear (instructional day{selectedDates.length > 1 ? "s" : ""})
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-xs leading-5 text-slate-500">
              Click a day on the calendar to mark it as a holiday, PD day, or
              other non-instructional day. Shift-click a second day to select
              everything in between (e.g. the first and last day of a break).
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
                      const isSelected = selectedDates.includes(cell.date);

                      return (
                        <button
                          className={[
                            "flex h-11 flex-col items-center justify-center rounded-md px-0.5 text-[0.6rem] leading-tight",
                            !clickable
                              ? "text-slate-300"
                              : blocked
                                ? "bg-amber-100 font-medium text-amber-900"
                                : "text-slate-700 hover:bg-slate-100",
                            clickable && isSelected ? "ring-2 ring-blue-400" : "",
                          ].join(" ")}
                          disabled={!clickable}
                          key={cell.date}
                          onClick={(event) => handleDayClick(cell.date, event.shiftKey)}
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
    </>
  );
}
