import Link from "next/link";
import type { SchoolYear } from "./types";

type ServerAction = (formData: FormData) => void | Promise<void>;

type SettingsPageProps = {
  aiConfigured: boolean;
  aiApiKeySet: boolean;
  aiBaseUrl: string;
  aiModel: string;
  clearApiKeyAction: ServerAction;
  saved?: string;
  updateAction: ServerAction;
  activeSchoolYearId: string;
  schoolYears: SchoolYear[];
  switchYearAction: ServerAction;
  deleteYearAction: ServerAction;
  error?: string;
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

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
  clearApiKeyAction,
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
          Settings saved.
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
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-950">
            AI provider
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

        <form action={updateAction} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">
              Hosted provider API key
            </span>
            <input
              autoComplete="off"
              className={inputClass}
              name="aiApiKey"
              placeholder={
                aiApiKeySet
                  ? "•••••••••••••••• (set — leave blank to keep it)"
                  : "sk-..."
              }
              type="password"
            />
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              For a hosted provider like OpenAI. Leave the local model URL
              below blank if using this. Never shown again once saved — leave
              blank on future saves to keep it, or use{" "}
              <span className="font-medium">Clear key</span> below to remove
              it.
            </span>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">
              Local model base URL
            </span>
            <input
              className={inputClass}
              defaultValue={aiBaseUrl}
              name="aiBaseUrl"
              placeholder="http://localhost:11434/v1 (Ollama, LM Studio, ...)"
              type="text"
            />
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              For full-privacy homelab use — no API key required, nothing
              leaves your network. Set this instead of an API key.
            </span>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Model</span>
            <input
              className={inputClass}
              defaultValue={aiModel}
              name="aiModel"
              placeholder="gpt-4o-mini (default)"
              type="text"
            />
          </label>

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
              Clear API key
            </button>
          </form>
        ) : null}
      </section>
    </>
  );
}
