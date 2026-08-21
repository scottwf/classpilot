import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildMiniCalendarDays, monthKeyFromDate, monthLabel, shiftMonthKey } from "./mini-calendar";

type MiniCalendarProps = {
  /** Which month's grid to show. Defaults to selectedDate's month -- only
   * set explicitly when browsing months via the prev/next arrows without
   * changing the selected day (see the `month` query param in app/page.tsx). */
  monthKey?: string;
  selectedDate: string;
  todayDate: string;
  view: "day" | "week";
};

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

/** Plain links (no client JS) so this stays a server component, matching
 * PlanBookNav/ViewSwitcher's pattern of navigating via `?view=&date=`. */
export function MiniCalendar({ monthKey, selectedDate, todayDate, view }: MiniCalendarProps) {
  const activeMonth = monthKey ?? monthKeyFromDate(selectedDate);
  const days = buildMiniCalendarDays(activeMonth);
  const prevMonth = shiftMonthKey(activeMonth, -1);
  const nextMonth = shiftMonthKey(activeMonth, 1);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <Link
          aria-label="Previous month"
          className="flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          href={`/?view=${view}&date=${selectedDate}&month=${prevMonth}`}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Link>
        <p className="text-sm font-semibold text-slate-950">{monthLabel(activeMonth)}</p>
        <Link
          aria-label="Next month"
          className="flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          href={`/?view=${view}&date=${selectedDate}&month=${nextMonth}`}
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
        {weekdayLabels.map((label, index) => (
          <div key={`${label}-${index}`}>{label}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          const isToday = day.date === todayDate;

          return (
            <Link
              className={[
                "flex size-8 items-center justify-center rounded-md text-xs",
                !day.inCurrentMonth ? "text-slate-300" : "text-slate-700",
                isSelected
                  ? "bg-blue-600 font-semibold text-white"
                  : isToday
                    ? "border border-blue-400 font-semibold text-blue-700"
                    : "hover:bg-slate-100",
              ].join(" ")}
              // No `month` param here -- clicking a day resets the grid to
              // that day's own month, which is already correct once
              // selectedDate changes (see monthKeyFromDate fallback above).
              href={`/?view=${view}&date=${day.date}`}
              key={day.date}
            >
              {day.dayOfMonth}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
