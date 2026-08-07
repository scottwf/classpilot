import Link from "next/link";
import { AppShell } from "@/src/features/planner/AppShell";
import { LessonSectionFields } from "@/src/features/planner/LessonSectionFields";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { createLessonAction } from "./actions";

type NewLessonPageProps = {
  searchParams: Promise<{
    classId?: string;
    date?: string;
    error?: string;
    unitId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NewLessonPage({
  searchParams,
}: NewLessonPageProps) {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const params = await searchParams;
  const selectedDate = params.date ?? "2026-09-11";
  // Clicking a scheduled class slot on Plan Book links here with classId
  // instead of unitId (a slot doesn't know which unit) — prefer that
  // class's first unit so the dropdown starts on the right class.
  const classUnitId = params.classId
    ? plannerData.units.find((unit) => unit.classId === params.classId)?.id
    : undefined;
  const selectedUnitId = plannerData.units.some((unit) => unit.id === params.unitId)
    ? params.unitId
    : (classUnitId ?? plannerData.units[0]?.id);

  return (
    <AppShell activePage="lessons" data={plannerData}>
      <section>
        <p className="text-sm font-medium text-blue-700">New lesson</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Add a lesson to the plan book.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Save a planned lesson to SQLite and connect it to a unit and any
          outcomes you want to track.
        </p>
      </section>

      <form
        action={createLessonAction}
        className="grid gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="space-y-4">
          <Field label="Lesson title" name="title" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              defaultValue={selectedDate}
              label="Date"
              name="date"
              required
              type="date"
            />
            <Field
              defaultValue="55"
              label="Duration minutes"
              min="1"
              name="durationMinutes"
              required
              type="number"
            />
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Unit</span>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              defaultValue={selectedUnitId}
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
              name="summary"
            />
          </label>

          <LessonSectionFields />
        </div>

        <aside className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              Track outcomes
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Pick the outcomes this lesson will address. This will feed the
              outcome map.
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

          {params.error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Please check the highlighted lesson details and try again.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <button
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
              type="submit"
            >
              Save lesson
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
