"use client";

import { useState } from "react";
import { OutcomePicker } from "./OutcomePicker";
import type { ClassColor, ClassSection, CurriculumOutcome } from "./types";

type CurriculumLibraryProps = {
  outcomes: CurriculumOutcome[];
  classes: ClassSection[];
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

export function CurriculumLibrary({ outcomes, classes }: CurriculumLibraryProps) {
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const subjects = summarizeSubjects(outcomes);
  // The active year's instructional class teaching each subject, if any —
  // used to color-match the subject tile to that class.
  const classBySubject = new Map(
    classes
      .filter((classSection) => classSection.isInstructional)
      .map((classSection) => [classSection.subject, classSection]),
  );
  const visibleOutcomes = subjectFilter
    ? outcomes.filter((outcome) => outcome.subject === subjectFilter)
    : outcomes;

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

      <p className="mt-2 text-xs leading-5 text-slate-500">
        Click a subject to filter the list below, or search across all
        subjects.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {subjects.map((subject) => {
          const matchingClass = classBySubject.get(subject.name);
          const isActive = subjectFilter === subject.name;

          return (
            <button
              className={`rounded-lg border px-3 py-2 text-left ${
                isActive
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100"
              }`}
              key={subject.name}
              onClick={() => setSubjectFilter(isActive ? null : subject.name)}
              type="button"
            >
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-950">
                {matchingClass ? (
                  <span
                    aria-hidden="true"
                    className={`size-2.5 shrink-0 rounded-full ${classDotColorClass[matchingClass.color]}`}
                  />
                ) : null}
                {subject.name}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {subject.count} outcomes
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <OutcomePicker
          emptyMessage="No outcomes loaded yet."
          outcomes={visibleOutcomes}
          selectable={false}
        />
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
