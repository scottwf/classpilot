import Link from "next/link";
import { Plus } from "lucide-react";
import { getUnitTimelinePosition } from "./timeline";
import type { ClassSection, InstructionalDay, UnitPlan } from "./types";

const colorClass: Record<UnitPlan["color"], string> = {
  amber: "bg-amber-300 text-amber-950 border-amber-400",
  blue: "bg-blue-300 text-blue-950 border-blue-400",
  emerald: "bg-emerald-300 text-emerald-950 border-emerald-400",
  rose: "bg-rose-300 text-rose-950 border-rose-400",
  violet: "bg-violet-300 text-violet-950 border-violet-400",
};

type UnitTimelineProps = {
  classes: ClassSection[];
  units: UnitPlan[];
  instructionalDays: InstructionalDay[];
};

export function UnitTimeline({
  classes,
  units,
  instructionalDays,
}: UnitTimelineProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Unit Planner Timeline
          </h2>
          <p className="text-sm text-slate-600">
            Drag-and-resize planning will come after the timeline model is stable.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm"
          href="/units/new"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add unit
        </Link>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div
            className="grid border-b border-slate-200 bg-slate-50"
            style={{
              gridTemplateColumns: `180px repeat(${instructionalDays.length}, minmax(28px, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 p-3 text-xs font-semibold uppercase text-slate-500">
              Class
            </div>
            {instructionalDays.map((day) => (
              <div
                className="border-r border-slate-200 px-1 py-2 text-center text-[0.68rem] leading-tight text-slate-500"
                key={day.key}
              >
                <div>{day.monthLabel}</div>
                <div className="font-semibold text-slate-700">
                  {day.date.getUTCDate()}
                </div>
              </div>
            ))}
          </div>

          {classes.map((classSection) => {
            const classUnits = units.filter(
              (unit) => unit.classId === classSection.id,
            );

            return (
              <div
                className="grid min-h-24 border-b border-slate-200 last:border-b-0"
                key={classSection.id}
                style={{
                  gridTemplateColumns: `180px repeat(${instructionalDays.length}, minmax(28px, 1fr))`,
                }}
              >
                <div className="sticky left-0 z-10 border-r border-slate-200 bg-white p-3">
                  <h3 className="font-semibold text-slate-950">
                    {classSection.name}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {classSection.meetingPattern}
                  </p>
                </div>

                <div
                  className="relative col-span-full col-start-2 grid min-h-24"
                  style={{
                    gridTemplateColumns: `repeat(${instructionalDays.length}, minmax(28px, 1fr))`,
                  }}
                >
                  {instructionalDays.map((day) => (
                    <div
                      className="border-r border-slate-100"
                      key={`${classSection.id}-${day.key}`}
                    />
                  ))}

                  {classUnits.map((unit) => {
                    const position = getUnitTimelinePosition(
                      unit,
                      instructionalDays,
                    );

                    return (
                      <Link
                        className={`z-10 mx-1 mt-5 h-11 rounded-md border px-3 py-2 text-sm font-semibold shadow-sm ${colorClass[unit.color]}`}
                        href={`/units/${unit.id}`}
                        key={unit.id}
                        style={{
                          gridColumn: `${position.gridColumnStart} / span ${position.gridColumnSpan}`,
                          gridRow: "1",
                        }}
                        title={`${unit.title}: ${position.instructionalDays} instructional days`}
                      >
                        <div className="truncate">{unit.title}</div>
                        <div className="mt-1 flex gap-1">
                          {unit.lessons.map((lesson) => (
                            <span
                              aria-label={lesson.title}
                              className="size-1.5 rounded-full bg-current opacity-60"
                              key={lesson.id}
                            />
                          ))}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
