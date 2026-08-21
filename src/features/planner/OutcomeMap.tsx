import type { SubjectOutcomeCoverage } from "./lesson-queries";
import type { ClassColor } from "./types";

type OutcomeMapProps = {
  coverage: SubjectOutcomeCoverage[];
};

const classDotColorClass: Record<ClassColor, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
};

export function OutcomeMap({ coverage }: OutcomeMapProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-medium text-blue-700">Outcome map</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">
          Coverage by class
        </h2>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {coverage.map((subject) => (
          <article
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            key={subject.classId}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-semibold text-slate-950">
                <span
                  aria-hidden="true"
                  className={`size-2.5 shrink-0 rounded-full ${classDotColorClass[subject.color]}`}
                />
                {subject.subject}
              </h3>
              <span className="text-xs text-slate-500">
                {subject.covered.length} covered · {subject.planned.length} planned
              </span>
            </div>

            <div className="mt-3 space-y-3">
              <OutcomeGroup
                label="Covered"
                outcomes={subject.covered}
                tone="emerald"
              />
              <OutcomeGroup label="Planned" outcomes={subject.planned} tone="amber" />
              <OutcomeGroup
                label="Not planned"
                outcomes={subject.uncovered.slice(0, 6)}
                tone="slate"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function OutcomeGroup({
  label,
  outcomes,
  tone,
}: {
  label: string;
  outcomes: Array<{ code: string; description: string }>;
  tone: "amber" | "emerald" | "slate";
}) {
  const colorClass = {
    amber: "bg-amber-100 text-amber-900",
    emerald: "bg-emerald-100 text-emerald-900",
    slate: "bg-white text-slate-700",
  }[tone];

  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {outcomes.length > 0 ? (
          outcomes.map((outcome) => (
            <span
              className={`rounded-md px-2 py-1 text-xs font-medium ${colorClass}`}
              key={outcome.code}
              title={outcome.description}
            >
              {outcome.code}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-400">None yet</span>
        )}
      </div>
    </div>
  );
}
