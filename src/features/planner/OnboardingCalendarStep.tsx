"use client";

import { useState } from "react";
import { CalendarGrid } from "./CalendarGrid";
import type { DayLabelScheme } from "./types";

type OnboardingCalendarStepProps = {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export function OnboardingCalendarStep({ action, error }: OnboardingCalendarStepProps) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cycleLength, setCycleLength] = useState(5);
  const [dayLabelScheme, setDayLabelScheme] = useState<DayLabelScheme>("numeric");

  return (
    <form action={action} className="space-y-5">
      <CalendarGrid
        cycleLength={cycleLength}
        dayLabelScheme={dayLabelScheme}
        endDate={endDate}
        hiddenInputName="blockedDatesJson"
        initialBlockedDates={[]}
        startDate={startDate}
        leftColumn={
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
        }
      />
    </form>
  );
}
