"use client";

import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import type { CurriculumOutcome } from "./types";

type OutcomePickerProps = {
  outcomes: CurriculumOutcome[];
  /** Checkbox name — the surrounding <form> collects these as usual, this
   * component doesn't manage form state itself. */
  name: string;
  selectedIds?: string[];
  emptyMessage: React.ReactNode;
};

/**
 * Checkbox list of curriculum outcomes with a search box (matches code or
 * description, e.g. typing "pattern" surfaces every outcome that mentions
 * it) and a per-row expand toggle for the full description — outcome codes
 * alone aren't enough to pick the right one from a list of 40+.
 */
export function OutcomePicker({ outcomes, name, selectedIds, emptyMessage }: OutcomePickerProps) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selected = new Set(selectedIds ?? []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOutcomes = normalizedQuery
    ? outcomes.filter(
        (outcome) =>
          outcome.code.toLowerCase().includes(normalizedQuery) ||
          outcome.description.toLowerCase().includes(normalizedQuery),
      )
    : outcomes;

  return (
    <div>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
        />
        <input
          className="mb-2 w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search outcomes…"
          type="text"
          value={query}
        />
      </div>

      {outcomes.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-slate-500">{emptyMessage}</p>
      ) : filteredOutcomes.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-slate-500">
          No outcomes match &quot;{query}&quot;.
        </p>
      ) : (
        filteredOutcomes.map((outcome) => {
          const isExpanded = expandedId === outcome.id;

          return (
            <div className="rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50" key={outcome.id}>
              <div className="flex items-start gap-2">
                <input
                  className="mt-1"
                  defaultChecked={selected.has(outcome.id)}
                  name={name}
                  type="checkbox"
                  value={outcome.id}
                />
                <button
                  className="flex flex-1 items-start gap-1 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : outcome.id)}
                  type="button"
                >
                  {isExpanded ? (
                    <ChevronDown aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                  )}
                  <span className={isExpanded ? "" : "line-clamp-1"}>
                    <span className="font-semibold text-slate-950">{outcome.code}</span>{" "}
                    {outcome.description}
                  </span>
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
