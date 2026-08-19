"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LessonBank } from "./LessonBank";
import type { LessonBankFilters, LessonBankSort } from "./lesson-queries";
import { buildLessonBankFilterOptions, filterLessonBank, sortLessonBank } from "./lesson-queries";
import type { PlannerData } from "./types";

type LessonsPageProps = {
  data: PlannerData;
};

export function LessonsPage({ data }: LessonsPageProps) {
  const [sort, setSort] = useState<LessonBankSort>("date");
  const [filters, setFilters] = useState<LessonBankFilters>({});
  const sortedLessons = useMemo(() => sortLessonBank(data, sort), [data, sort]);
  const filterOptions = useMemo(
    () => buildLessonBankFilterOptions(sortedLessons),
    [sortedLessons],
  );
  const lessons = useMemo(
    () => filterLessonBank(sortedLessons, filters),
    [sortedLessons, filters],
  );

  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">Lesson bank</p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Find and organize every class lesson.
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              href="/lessons/import"
            >
              Import Markdown
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
              href="/lessons/new"
            >
              Add lesson
            </Link>
          </div>
        </div>
      </section>

      <LessonBank
        filterOptions={filterOptions}
        filters={filters}
        lessons={lessons}
        onFiltersChange={setFilters}
        onSortChange={setSort}
        sort={sort}
        totalCount={sortedLessons.length}
      />
    </>
  );
}
