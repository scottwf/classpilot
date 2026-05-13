import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AppShell } from "@/src/features/planner/AppShell";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { importLessonMarkdownAction } from "./actions";

type ImportLessonPageProps = {
  searchParams: Promise<{
    error?: string;
    unitId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ImportLessonPage({
  searchParams,
}: ImportLessonPageProps) {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const params = await searchParams;
  const selectedUnit = plannerData.units.find((unit) => unit.id === params.unitId);
  const template = readFileSync(
    join(process.cwd(), "docs", "lesson-import-template.md"),
    "utf8",
  ).replace(
    "Use the exact unit title or unit id",
    selectedUnit?.title ?? "Use the exact unit title or unit id",
  );

  return (
    <AppShell activePage="lessons" data={plannerData}>
      <section>
        <p className="text-sm font-medium text-blue-700">Markdown import</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Import one lesson from a Markdown file.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Use the template headings so ClassPilot can read the lesson date,
          unit, duration, outcomes, and reusable lesson sections.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          action={importLessonMarkdownAction}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Markdown file
            </span>
            <input
              accept=".md,text/markdown,text/plain"
              className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
              name="lessonFile"
              type="file"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Or paste Markdown
            </span>
            <textarea
              className="mt-2 min-h-80 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              name="lessonMarkdown"
              placeholder={template}
            />
          </label>

          {params.error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              The import could not be saved. Check the file, unit title, date,
              duration, and outcome codes.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
              type="submit"
            >
              Import lesson
            </button>
            <Link
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              href="/lessons"
            >
              Cancel
            </Link>
          </div>
        </form>

        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">
            Template
          </h3>
          <pre className="mt-3 max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
            {template}
          </pre>
        </aside>
      </div>
    </AppShell>
  );
}
