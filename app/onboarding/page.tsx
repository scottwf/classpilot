import { AppShell } from "@/src/features/planner/AppShell";
import { OnboardingSteps } from "@/src/features/planner/OnboardingSteps";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { createOnboardingYearAction } from "./actions";

type OnboardingPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export const dynamic = "force-dynamic";

export default async function OnboardingRoute({ searchParams }: OnboardingPageProps) {
  await requireAuth();

  const plannerData = getClassPilotPlannerData();
  const params = await searchParams;

  return (
    <AppShell activePage="onboarding" data={plannerData}>
      <OnboardingSteps current="year" />

      <section>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Start a new school year
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Classes, units, lessons, periods, and schedules all start fresh for
          a new year. Your existing years and their data stay exactly as
          they are — switch back anytime from the Calendar page.
        </p>
      </section>

      {params.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Check the title, that the end date is after the start date, and
          that the cycle length is a whole number of at least 1.
        </p>
      ) : null}

      <form
        action={createOnboardingYearAction}
        className="max-w-lg space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Title</span>
          <input
            className={inputClass}
            name="title"
            placeholder="e.g. 2027-2028 Grade 6 Homeroom"
            required
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Start date</span>
            <input className={inputClass} name="startDate" required type="date" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">End date</span>
            <input className={inputClass} name="endDate" required type="date" />
          </label>
        </div>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Day cycle length</span>
          <input
            className={inputClass}
            defaultValue={5}
            min={1}
            name="cycleLength"
            required
            step={1}
            type="number"
          />
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            2 for odd/even days, 5 or 6 for a rotating cycle, or match your
            term length for no rotation. You can change this later.
          </span>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Cycle day labels</span>
          <select className={inputClass} defaultValue="numeric" name="dayLabelScheme">
            <option value="numeric">Numeric — Day 1, Day 2...</option>
            <option value="letters">Letters — Day A, Day B...</option>
            <option value="odd-even">Odd/Even — for a 2-day cycle</option>
          </select>
        </label>
        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
          type="submit"
        >
          Continue
        </button>
      </form>
    </AppShell>
  );
}
