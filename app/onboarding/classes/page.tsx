import Link from "next/link";
import { AppShell } from "@/src/features/planner/AppShell";
import { OnboardingSteps } from "@/src/features/planner/OnboardingSteps";
import type { ClassColor } from "@/src/features/planner/types";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { addOnboardingClassAction, removeOnboardingClassAction } from "../actions";

type OnboardingClassesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const classColors: ClassColor[] = [
  "blue",
  "emerald",
  "amber",
  "rose",
  "violet",
  "sky",
  "orange",
  "teal",
];

const classColorSwatchClass: Record<ClassColor, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
};

const classDotColorClass = classColorSwatchClass;

export const dynamic = "force-dynamic";

export default async function OnboardingClassesRoute({
  searchParams,
}: OnboardingClassesPageProps) {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const params = await searchParams;

  return (
    <AppShell activePage="onboarding" data={plannerData}>
      <OnboardingSteps current="classes" />

      <section>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Add classes to {plannerData.schoolYear.title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Add every class you teach this year. Room, meeting pattern, and
          cycle days can be fine-tuned later from Classes — the bell
          schedule step after this will fill in cycle days automatically as
          you assign each class to a day and period.
        </p>
      </section>

      {params.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Enter a name, subject, and grade.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">
            Classes added so far ({plannerData.classes.length})
          </h3>

          {plannerData.classes.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No classes yet — add your first one using the form on the
              right.
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {plannerData.classes.map((classSection) => (
                <li
                  className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                  key={classSection.id}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 shrink-0 rounded-full ${classDotColorClass[classSection.color]}`}
                    />
                    <span className="font-medium text-slate-950">
                      {classSection.name}
                    </span>
                    <span className="text-slate-500">
                      {classSection.subject} · Grade {classSection.grade}
                    </span>
                  </div>
                  <form action={removeOnboardingClassAction}>
                    <input name="id" type="hidden" value={classSection.id} />
                    <button
                      className="text-xs font-medium text-slate-400 hover:text-rose-600"
                      type="submit"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
            <Link
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
              href="/onboarding"
            >
              ← Back
            </Link>
            {plannerData.classes.length > 0 ? (
              <Link
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                href="/schedule?wizard=1"
              >
                Continue to bell schedule
              </Link>
            ) : null}
          </div>
        </section>

        <aside>
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">Add a class</h3>
            <form action={addOnboardingClassAction} className="mt-3 space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Class name</span>
                <input className={inputClass} name="name" required />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Subject</span>
                <input className={inputClass} name="subject" required />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Grade</span>
                <input className={inputClass} name="grade" required />
              </label>

              <div>
                <span className="text-sm font-medium text-slate-700">Color</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {classColors.map((color, index) => (
                    <label className="flex items-center" key={color} title={color}>
                      <input
                        className="peer sr-only"
                        defaultChecked={index === 0}
                        name="color"
                        type="radio"
                        value={color}
                      />
                      <span
                        className={`size-7 cursor-pointer rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-blue-600 ${classColorSwatchClass[color]}`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <label className="block text-sm">
                <span className="font-medium text-slate-700">
                  Target instructional minutes per year (optional)
                </span>
                <input
                  className={inputClass}
                  min={1}
                  name="targetMinutesPerYear"
                  placeholder="e.g. 5400"
                  type="number"
                />
              </label>

              <button
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                type="submit"
              >
                Add class
              </button>
            </form>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
