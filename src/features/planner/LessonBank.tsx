import Link from "next/link";
import type { EnrichedLesson, LessonBankSort } from "./lesson-queries";

type LessonBankProps = {
  lessons: EnrichedLesson[];
  onSortChange?: (sort: LessonBankSort) => void;
  sort: LessonBankSort;
};

const sortOptions: Array<{ label: string; value: LessonBankSort }> = [
  { label: "Date", value: "date" },
  { label: "Subject", value: "subject" },
  { label: "Unit", value: "unit" },
  { label: "Outcome", value: "outcome" },
];

export function LessonBank({ lessons, onSortChange, sort }: LessonBankProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Lesson bank</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            All class lessons
          </h2>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
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
              <div className="mt-1 text-xs text-slate-500">{lesson.date}</div>
            </div>
            <div className="text-slate-700">{lesson.subject}</div>
            <div className="text-slate-700">{lesson.unitTitle}</div>
            <div className="text-slate-700">{lesson.outcomeCodes.join(", ")}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
