import Link from "next/link";
import { ArrowDownUp, CalendarDays, Filter, Layers } from "lucide-react";
import { InfoTip } from "./InfoTip";
import { getUnitColorClasses } from "./unit-color";
import { getClassDotColorClass } from "./class-color";
import type {
  EnrichedLesson,
  LessonBankFilterOptions,
  LessonBankFilters,
  LessonBankSort,
} from "./lesson-queries";

type LessonBankProps = {
  filterOptions: LessonBankFilterOptions;
  filters: LessonBankFilters;
  lessons: EnrichedLesson[];
  onFiltersChange: (filters: LessonBankFilters) => void;
  onSortChange?: (sort: LessonBankSort) => void;
  sort: LessonBankSort;
  totalCount: number;
};

const sortOptions: Array<{ label: string; value: LessonBankSort }> = [
  { label: "Date", value: "date" },
  { label: "Subject", value: "subject" },
  { label: "Unit", value: "unit" },
  { label: "Outcome", value: "outcome" },
];

const selectClass =
  "rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export function LessonBank({
  filterOptions,
  filters,
  lessons,
  onFiltersChange,
  onSortChange,
  sort,
  totalCount,
}: LessonBankProps) {
  const hasActiveFilters = Boolean(
    filters.subject || filters.unitId || filters.grade || filters.outcomeCode,
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Lesson bank</p>
          <h2 className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-slate-950">
            All class lessons
            <InfoTip label="the lesson bank">
              The coloured dots are class colours; each unit is a shade of
              its class&apos;s colour. Sort by Unit to see a course in
              teaching order, or filter to narrow the list.
            </InfoTip>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          <ArrowDownUp aria-hidden="true" className="ml-1 size-3.5 text-slate-500" />
          {sortOptions.map((option) => (
            <button
              className={[
                "rounded-md px-3 py-1.5 text-xs font-medium",
                sort === option.value
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600",
              ].join(" ")}
              key={option.value}
              onClick={() => onSortChange?.(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Filter aria-hidden="true" className="size-3.5 text-slate-500" />
        <select
          className={selectClass}
          onChange={(event) =>
            onFiltersChange({ ...filters, subject: event.target.value || undefined })
          }
          value={filters.subject ?? ""}
        >
          <option value="">All subjects</option>
          {filterOptions.subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          onChange={(event) =>
            onFiltersChange({ ...filters, unitId: event.target.value || undefined })
          }
          value={filters.unitId ?? ""}
        >
          <option value="">All units</option>
          {filterOptions.units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.title}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          onChange={(event) =>
            onFiltersChange({ ...filters, grade: event.target.value || undefined })
          }
          value={filters.grade ?? ""}
        >
          <option value="">All grades</option>
          {filterOptions.grades.map((grade) => (
            <option key={grade} value={grade}>
              Grade {grade}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          onChange={(event) =>
            onFiltersChange({ ...filters, outcomeCode: event.target.value || undefined })
          }
          value={filters.outcomeCode ?? ""}
        >
          <option value="">All outcomes</option>
          {filterOptions.outcomeCodes.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>

        {hasActiveFilters ? (
          <button
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
            onClick={() => onFiltersChange({})}
            type="button"
          >
            Clear filters
          </button>
        ) : null}

        {hasActiveFilters ? (
          <span className="text-xs text-slate-400">
            {lessons.length} of {totalCount} lessons
          </span>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-[1fr_1fr_1fr_0.8fr] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
          <div>Lesson</div>
          <div>Subject</div>
          <div>Unit</div>
          <div>Outcome</div>
        </div>
        {lessons.map((lesson) => (
          <div
            className="grid grid-cols-[1fr_1fr_1fr_0.8fr] gap-3 border-t border-slate-200 px-3 py-3 text-sm"
            key={lesson.id}
          >
            <div>
              <Link
                className="font-medium text-slate-950 hover:text-blue-700"
                href={`/lessons/${lesson.id}`}
              >
                {lesson.title}
              </Link>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <CalendarDays aria-hidden="true" className="size-3 shrink-0" />
                {lesson.date ?? "Unscheduled"}
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span
                aria-hidden="true"
                className={`size-2.5 shrink-0 rounded-full ${getClassDotColorClass(lesson.classColor)}`}
              />
              {lesson.subject}
            </div>
            <div className="text-slate-700">
              <span
                className={`inline-flex max-w-full items-center gap-1 rounded border border-current/20 px-1.5 py-0.5 text-xs font-medium ${getUnitColorClasses(lesson.classColor, lesson.unitShadeIndex).block}`}
              >
                <Layers aria-hidden="true" className="size-3 shrink-0" />
                <span className="truncate">{lesson.unitTitle}</span>
              </span>
            </div>
            <div className="text-slate-700">{lesson.outcomeCodes.join(", ")}</div>
          </div>
        ))}
        {lessons.length === 0 ? (
          <p className="border-t border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
            No lessons match these filters.
          </p>
        ) : null}
      </div>
    </section>
  );
}
