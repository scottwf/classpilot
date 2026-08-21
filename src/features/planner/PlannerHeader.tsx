import { BookOpen } from "lucide-react";
import type { PlannerData } from "./types";

type PlannerHeaderProps = {
  data: PlannerData;
};

export function PlannerHeader({ data }: PlannerHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-5 sm:px-6 lg:px-8">
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
    </header>
  );
}
