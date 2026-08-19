import { BookOpen, CalendarDays, Sparkles } from "lucide-react";

type DashboardStatsProps = {
  classCount: number;
  unitCount: number;
  instructionalDayCount: number;
};

/**
 * Moved out of the site-wide header (issue #27: less clutter, and these
 * numbers are really Dashboard-relevant, not needed on every page) into a
 * compact vertical list under the mini calendar.
 */
export function DashboardStats({ classCount, unitCount, instructionalDayCount }: DashboardStatsProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <ul className="divide-y divide-slate-100">
        <StatRow
          icon={<CalendarDays aria-hidden="true" className="size-4" />}
          label="Classes"
          value={classCount}
        />
        <StatRow
          icon={<BookOpen aria-hidden="true" className="size-4" />}
          label="Units"
          value={unitCount}
        />
        <StatRow
          icon={<Sparkles aria-hidden="true" className="size-4" />}
          label="School days"
          value={instructionalDayCount}
        />
      </ul>
    </section>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <li className="flex items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0">
      <span className="flex items-center gap-2 text-slate-600">
        {icon}
        {label}
      </span>
      <span className="font-semibold text-slate-950">{value}</span>
    </li>
  );
}
