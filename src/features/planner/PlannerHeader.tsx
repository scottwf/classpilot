import { BookOpen, CalendarDays, Sparkles } from "lucide-react";
import type { PlannerData } from "./types";

type PlannerHeaderProps = {
  data: PlannerData;
  instructionalDayCount: number;
};

export function PlannerHeader({
  data,
  instructionalDayCount,
}: PlannerHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-blue-600 text-white">
              <BookOpen aria-hidden="true" className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
                ClassPilot
              </h1>
              <p className="text-sm text-slate-600">
                {data.schoolYear.title} personal plan book
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm sm:min-w-[28rem]">
          <Stat
            icon={<CalendarDays aria-hidden="true" className="size-4" />}
            label="Classes"
            value={data.classes.length.toString()}
          />
          <Stat
            icon={<BookOpen aria-hidden="true" className="size-4" />}
            label="Units"
            value={data.units.length.toString()}
          />
          <Stat
            icon={<Sparkles aria-hidden="true" className="size-4" />}
            label="School days"
            value={instructionalDayCount.toString()}
          />
        </div>
      </div>
    </header>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}
