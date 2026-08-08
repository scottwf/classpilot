import Link from "next/link";
import { HostedProviderFields } from "./HostedProviderFields";
import { LocalProviderFields } from "./LocalProviderFields";
import { ResetPlannerDataButton } from "./ResetPlannerDataButton";
import type { SchoolYear } from "./types";

type ServerAction = (formData: FormData) => void | Promise<void>;

type SettingsPageProps = {
  aiConfigured: boolean;
  aiApiKeySet: boolean;
  aiBaseUrl: string;
  aiModel: string;
  aiLocalConfigured: boolean;
  aiLocalBaseUrl: string;
  aiLocalModel: string;
  clearApiKeyAction: ServerAction;
  resetPlannerDataAction: () => void | Promise<void>;
  saved?: string;
  updateAction: ServerAction;
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
};

export function SettingsPage({
  aiConfigured,
  aiApiKeySet,
  aiBaseUrl,
  aiModel,
  aiLocalConfigured,
  aiLocalBaseUrl,
  aiLocalModel,
  clearApiKeyAction,
  resetPlannerDataAction,
  saved,
  updateAction,
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
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          School year management and the AI planning assistant live here.
          View or edit the active year&apos;s calendar from{" "}
          <Link className="text-blue-700 underline" href="/calendar">
            Calendar
          </Link>
          .
        </p>
      </section>

      {saved !== undefined ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {saved === "reset"
            ? "Planner data reset. Curriculum outcomes and AI settings were kept."
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
                    <form action={deleteYearAction}>
                      <input name="id" type="hidden" value={year.id} />
                      <button
                        className="text-xs font-medium text-slate-400 hover:text-rose-600"
                        type="submit"
                      >
                        Delete year
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm leading-6 text-slate-600">
          The assistant uses two separate providers. The hosted provider
          drafts content — unit outlines, lesson sections, lesson resources —
          and never sees student data. The local model drives the assistant
          chat&apos;s tool-calling and is the only one ever given access to
          student records, so they stay on your network.
        </p>

        <form action={updateAction} className="mt-4 space-y-6">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">
                Hosted provider (content generation)
              </h3>
              <span
                className={[
                  "rounded-md px-2 py-1 text-xs font-medium",
                  aiConfigured
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700",
                ].join(" ")}
              >
                {aiConfigured ? "Configured" : "Not configured"}
              </span>
            </div>

            <div className="mt-3">
              <HostedProviderFields
                aiApiKeySet={aiApiKeySet}
                aiBaseUrl={aiBaseUrl}
                aiModel={aiModel}
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">
                Local model (assistant chat + student records)
              </h3>
              <span
                className={[
                  "rounded-md px-2 py-1 text-xs font-medium",
                  aiLocalConfigured
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700",
                ].join(" ")}
              >
                {aiLocalConfigured ? "Configured" : "Not configured"}
              </span>
            </div>

            <div className="mt-3">
              <LocalProviderFields aiLocalBaseUrl={aiLocalBaseUrl} aiLocalModel={aiLocalModel} />
            </div>
          </div>

          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            type="submit"
          >
            Save settings
          </button>
        </form>

        {aiApiKeySet ? (
          <form action={clearApiKeyAction} className="mt-3">
            <button
              className="text-xs font-medium text-slate-400 hover:text-rose-600"
              type="submit"
            >
              Clear hosted API key
            </button>
          </form>
        ) : null}
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
