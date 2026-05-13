import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/src/features/planner/AppShell";
import { LessonSectionFields } from "@/src/features/planner/LessonSectionFields";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getLessonById } from "@/src/lib/db/planner-repository";
import { updateLessonAction } from "./actions";

type EditLessonPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

const lessonStatuses = ["planned", "taught", "delayed", "skipped"] as const;

export const dynamic = "force-dynamic";

export default async function EditLessonPage({
  params,
  searchParams,
}: EditLessonPageProps) {
  await requireAuth();

  const { lessonId } = await params;
  const plannerData = getClassPilotPlannerData();
  const lesson = getLessonById(getClassPilotDatabase(), lessonId);
  const query = await searchParams;

  if (!lesson) {
    notFound();
  }

  return (
    <AppShell activePage="lessons" data={plannerData}>
      <section>
        <p className="text-sm font-medium text-blue-700">Edit lesson</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Update lesson details.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Adjust timing, status, unit placement, summary, and outcome links.
        </p>
      </section>

      <form
        action={updateLessonAction}
        className="grid gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <input name="id" type="hidden" value={lesson.id} />

        <div className="space-y-4">
          <Field
            defaultValue={lesson.title}
            label="Lesson title"
            name="title"
            required
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              defaultValue={lesson.date}
              label="Date"
              name="date"
              required
              type="date"
            />
            <Field
              defaultValue={String(lesson.durationMinutes)}
              label="Duration minutes"
              min="1"
              name="durationMinutes"
              required
              type="number"
            />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                defaultValue={lesson.status}
                name="status"
              >
                {lessonStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Unit</span>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              defaultValue={lesson.unitId}
              name="unitId"
              required
            >
              {plannerData.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Summary</span>
            <textarea
              className="mt-2 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              defaultValue={lesson.summary}
              name="summary"
            />
          </label>

          <LessonSectionFields sections={lesson.sections} />
        </div>

        <aside className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              Tracked outcomes
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Update the outcomes this lesson addresses.
            </p>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {plannerData.outcomes.slice(0, 80).map((outcome) => (
              <label
                className="flex gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                key={outcome.id}
              >
                <input
                  className="mt-1"
                  defaultChecked={lesson.outcomeIds.includes(outcome.id)}
                  name="outcomeIds"
                  type="checkbox"
                  value={outcome.id}
                />
                <span>
                  <span className="font-semibold text-slate-950">
                    {outcome.code}
                  </span>{" "}
                  {outcome.subject}
                </span>
              </label>
            ))}
          </div>

          {query.error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Please check the lesson details and try again.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <button
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
              type="submit"
            >
              Save changes
            </button>
            <Link
              className="rounded-md px-4 py-2 text-center text-sm font-medium text-slate-600 hover:bg-slate-100"
              href="/lessons"
            >
              Cancel
            </Link>
          </div>
        </aside>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...inputProps
}: {
  defaultValue?: string;
  label: string;
  min?: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        name={name}
        type={type}
        {...inputProps}
      />
    </label>
  );
}
