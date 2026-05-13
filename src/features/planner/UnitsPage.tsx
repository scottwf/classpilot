import Link from "next/link";
import { buildInstructionalDays } from "./timeline";
import { UnitTimeline } from "./UnitTimeline";
import type { PlannerData } from "./types";

type UnitsPageProps = {
  data: PlannerData;
};

export function UnitsPage({ data }: UnitsPageProps) {
  const instructionalDays = buildInstructionalDays(data.schoolYear);

  return (
    <>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Unit timeline</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Place units across the school year.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            This is the long-range planning view. Create and edit units here,
            then build lessons inside them.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
          href="/units/new"
        >
          Add unit
        </Link>
      </section>

      <UnitTimeline
        classes={data.classes}
        instructionalDays={instructionalDays}
        units={data.units}
      />
    </>
  );
}
