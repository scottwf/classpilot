import Link from "next/link";
import { DeleteSchoolYearButton } from "./DeleteSchoolYearButton";
import { ResetPlannerDataButton } from "./ResetPlannerDataButton";
import { SettingsTabs } from "./SettingsTabs";
import type { SchoolYear } from "./types";

type ServerAction = (formData: FormData) => void | Promise<void>;

type SettingsPageProps = {
  resetPlannerDataAction: () => void | Promise<void>;
  saved?: string;
  activeSchoolYearId: string;
  schoolYears: SchoolYear[];
  switchYearAction: ServerAction;
  deleteYearAction: ServerAction;
  error?: string;
};

const errorMessages: Record<string, string> = {
  year: "Something went wrong with that school year action. Try again.",
  "delete-active-year":
    "Can't delete the active school year. Switch to a different year first.",
  "delete-year": "Couldn't delete this school year. Please try again.",
  "delete-backup-failed":
    "Couldn't create a safety backup before deleting, so nothing was deleted. Please try again.",
};

export function SettingsPage({
  resetPlannerDataAction,
  saved,
  activeSchoolYearId,
  schoolYears,
  switchYearAction,
  deleteYearAction,
  error,
}: SettingsPageProps) {
  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">Settings</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          App configuration.
        </h2>
      </section>

      <SettingsTabs active="years" />

      {saved !== undefined ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {saved === "reset"
            ? "Planner data reset. Curriculum outcomes and AI settings were kept."
            : saved === "deleted"
              ? "School year deleted. A safety backup was saved on the server first."
              : "Settings saved."}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessages[error] ?? "Please check the form and try again."}
        </p>
      ) : null}

      <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">School years</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Classes, units, lessons, periods, and schedules are each scoped
              to one school year. Switching years changes what the rest of
              the app shows.
            </p>
          </div>
          <Link
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm"
            href="/onboarding"
          >
            Start a new school year
          </Link>
        </div>

        <ul className="mt-3 space-y-1.5">
          {schoolYears.map((year) => {
            const isActive = year.id === activeSchoolYearId;

            return (
              <li
                className={[
                  "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm",
                  isActive ? "border-blue-300 bg-blue-50" : "border-slate-200",
                ].join(" ")}
                key={year.id}
              >
                <div>
                  <span className="font-medium text-slate-950">{year.title}</span>{" "}
                  <span className="text-slate-500">
                    {year.startDate} → {year.endDate}
                  </span>
                  {isActive ? (
                    <span className="ml-2 rounded-md bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white">
                      Active
                    </span>
                  ) : null}
                </div>
                {isActive ? null : (
                  <div className="flex items-center gap-3">
                    <form action={switchYearAction}>
                      <input name="id" type="hidden" value={year.id} />
                      <button
                        className="text-xs font-medium text-blue-700 hover:text-blue-900"
                        type="submit"
                      >
                        Switch to this year
                      </button>
                    </form>
                    <DeleteSchoolYearButton
                      action={deleteYearAction}
                      yearId={year.id}
                      yearTitle={year.title}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="max-w-2xl rounded-lg border border-rose-200 bg-rose-50/40 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Danger zone</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          For testing a fresh install during development. Deletes every
          school year, class, schedule, unit, lesson, and student.
          Curriculum outcomes and AI provider settings are kept, so you
          don&apos;t need to re-import or reconfigure those after.
        </p>
        <div className="mt-3">
          <ResetPlannerDataButton action={resetPlannerDataAction} />
        </div>
      </section>
    </>
  );
}
