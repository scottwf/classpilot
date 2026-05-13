import type { CurriculumOutcome } from "./types";

type CurriculumLibraryProps = {
  outcomes: CurriculumOutcome[];
};

export function CurriculumLibrary({ outcomes }: CurriculumLibraryProps) {
  const subjects = summarizeSubjects(outcomes);
  const featuredOutcomes = outcomes.slice(0, 5);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Curriculum library</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Saskatchewan Grade 6 Outcomes
          </h2>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700">
          {outcomes.length} outcomes
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {subjects.map((subject) => (
          <div
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            key={subject.name}
          >
            <div className="text-sm font-medium text-slate-950">
              {subject.name}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {subject.count} outcomes
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {featuredOutcomes.map((outcome) => (
          <article
            className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700"
            key={outcome.id}
          >
            <span className="font-semibold text-slate-950">{outcome.code}</span>{" "}
            <span>{outcome.description}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function summarizeSubjects(outcomes: CurriculumOutcome[]) {
  const counts = new Map<string, number>();

  for (const outcome of outcomes) {
    counts.set(outcome.subject, (counts.get(outcome.subject) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}
