import type { LessonSections } from "./types";
import { lessonSectionFields } from "@/src/lib/lessons/lesson-sections";

type LessonSectionFieldsProps = {
  sections?: LessonSections;
};

export function LessonSectionFields({ sections }: LessonSectionFieldsProps) {
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-950">
          Lesson sections
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          These sections match the Markdown import template and will support
          richer lesson planning later.
        </p>
      </div>

      <div className="grid gap-4">
        {lessonSectionFields.map((field) => (
          <label className="block" key={field.name}>
            <span className="text-sm font-medium text-slate-700">
              {field.label}
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              {field.description}
            </span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              defaultValue={sections?.[field.name]}
              name={field.name}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
