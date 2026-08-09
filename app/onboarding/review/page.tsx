import Link from "next/link";
import { AppShell } from "@/src/features/planner/AppShell";
import { computeInstructionalTimeSummary } from "@/src/features/planner/instructional-time";
import { OnboardingSteps } from "@/src/features/planner/OnboardingSteps";
import type { ClassColor } from "@/src/features/planner/types";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { getScheduleSlots } from "@/src/lib/db/schedule-repository";

const classDotColorClass: Record<ClassColor, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
};

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
}

export const dynamic = "force-dynamic";

export default async function OnboardingReviewRoute() {
  await requireAuth();

  const db = getClassPilotDatabase();
  const plannerData = getClassPilotPlannerData();
  const schoolYearId = plannerData.schoolYear.id;
  const scheduleSlots = getScheduleSlots(db, schoolYearId);
  // Non-instructional blocks (recess, supervision, assemblies) aren't real
  // curriculum time — exclude them from the review.
  const instructionalClasses = plannerData.classes.filter(
    (classSection) => classSection.isInstructional,
  );
  const summary = computeInstructionalTimeSummary(
    plannerData.schoolYear,
    instructionalClasses,
    scheduleSlots,
  );
  const summaryByClassId = new Map(summary.map((entry) => [entry.classId, entry]));
  const underTargetCount = summary.filter((entry) => !entry.meetsTarget).length;

  return (
    <AppShell activePage="onboarding" data={plannerData}>
      <OnboardingSteps current="review" />

      <section>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Review {plannerData.schoolYear.title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Total scheduled instructional time per class, based on the bell
          schedule you just set up.
        </p>
      </section>

      {underTargetCount > 0 ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {underTargetCount} {underTargetCount === 1 ? "class is" : "classes are"} scheduled
          under its instructional-minutes target. You can still finish setup
          and adjust the schedule later from Schedule or Classes.
        </p>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {instructionalClasses.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            No instructional classes yet —{" "}
            <Link className="text-blue-700 underline" href="/onboarding/classes">
              go back and add some
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {instructionalClasses.map((classSection) => {
              const entry = summaryByClassId.get(classSection.id);
              const scheduledMinutes = entry?.scheduledMinutes ?? 0;
              const target = classSection.targetMinutesPerYear;
              const meetsTarget = entry?.meetsTarget ?? true;

              return (
                <li className="flex items-center justify-between gap-3 p-4" key={classSection.id}>
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 shrink-0 rounded-full ${classDotColorClass[classSection.color]}`}
                    />
                    <div>
                      <div className="font-medium text-slate-950">{classSection.name}</div>
                      <div className="text-xs text-slate-500">{classSection.subject}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-950">
                      {formatMinutes(scheduledMinutes)}
                    </div>
                    {target ? (
                      <div
                        className={`text-xs font-medium ${meetsTarget ? "text-emerald-700" : "text-amber-700"}`}
                      >
                        {meetsTarget ? "Meets" : "Under"} target ({formatMinutes(target)})
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">No target set</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex items-center justify-between">
        <Link
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
          href="/settings/schedule?wizard=1"
        >
          ← Back to bell schedule
        </Link>
        <Link
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
          href="/"
        >
          Finish setup
        </Link>
      </div>
    </AppShell>
  );
}
