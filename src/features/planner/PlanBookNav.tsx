import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftDateKey, shiftToWeekday } from "./lesson-queries";

type PlanBookNavProps = {
  date: string;
  todayDate: string;
  view: "day" | "week";
};

const navButtonClass =
  "flex size-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100";

/** Prev/Today/Next controls plus a jump-to-date field for the Plan Book —
 * day view steps by 1 calendar day, week view by 7. Plain links/form (no
 * client JS) so this stays a server component. */
export function PlanBookNav({ date, todayDate, view }: PlanBookNavProps) {
  // Week view always steps by 7 calendar days (same weekday every time, so
  // weekends never come up as a *target*); day view skips weekends outright
  // since a teacher never has anything scheduled on one (issue #40).
  const prevDate = view === "week" ? shiftDateKey(date, -7) : shiftToWeekday(date, -1);
  const nextDate = view === "week" ? shiftDateKey(date, 7) : shiftToWeekday(date, 1);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        aria-label={`Previous ${view}`}
        className={navButtonClass}
        href={`/?view=${view}&date=${prevDate}`}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </Link>
      <Link
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        href={`/?view=${view}&date=${todayDate}`}
      >
        Today
      </Link>
      <Link
        aria-label={`Next ${view}`}
        className={navButtonClass}
        href={`/?view=${view}&date=${nextDate}`}
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
      <form action="/" className="flex items-center gap-1.5" method="get">
        <input name="view" type="hidden" value={view} />
        <input
          aria-label="Jump to date"
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          defaultValue={date}
          name="date"
          type="date"
        />
        <button
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          type="submit"
        >
          Go
        </button>
      </form>
    </div>
  );
}
