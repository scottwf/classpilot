import { CurriculumLibrary } from "./CurriculumLibrary";
import { buildOutcomeCoverage } from "./lesson-queries";
import { OutcomeMap } from "./OutcomeMap";
import type { PlannerData } from "./types";

type OutcomesPageProps = {
  data: PlannerData;
};

export function OutcomesPage({ data }: OutcomesPageProps) {
  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">Outcomes</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Map curriculum coverage by subject.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          See which Grade 6 outcomes are covered, planned, or not yet planned.
          This is where unit and lesson planning connects back to curriculum.
        </p>
      </section>

      <OutcomeMap coverage={buildOutcomeCoverage(data)} />
      <CurriculumLibrary classes={data.classes} outcomes={data.outcomes} />
    </>
  );
}
