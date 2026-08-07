"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ImportRosterState, importRosterCsvAction } from "@/app/students/import/actions";

type ImportRosterPageProps = {
  action: typeof importRosterCsvAction;
  sampleCsv: string;
};

const initialState: ImportRosterState = { status: "idle" };

export function ImportRosterPage({ action, sampleCsv }: ImportRosterPageProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">CSV import</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Import students from a CSV file.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Only <code className="rounded bg-slate-100 px-1 py-0.5">first_name</code> and{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5">last_name</code> are required —
          every other column is optional. Rows with a problem are skipped and
          reported below instead of stopping the whole import.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          action={formAction}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">CSV file</span>
            <input
              accept=".csv,text/csv"
              className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
              name="rosterFile"
              type="file"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Or paste CSV text
            </span>
            <textarea
              className="mt-2 min-h-64 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              name="rosterCsv"
              placeholder={sampleCsv}
            />
          </label>

          {state.status === "error" ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {state.message}
            </p>
          ) : null}

          {state.status === "done" ? (
            <div className="space-y-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <p>
                Imported {state.importedCount}{" "}
                {state.importedCount === 1 ? "student" : "students"}
                {state.errors.length > 0
                  ? `, skipped ${state.errors.length} row${state.errors.length === 1 ? "" : "s"}.`
                  : "."}
              </p>
              {state.errors.length > 0 ? (
                <ul className="list-inside list-disc text-amber-800">
                  {state.errors.map((error) => (
                    <li key={error.rowNumber}>
                      Row {error.rowNumber}: {error.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <SubmitButton />
            <Link
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              href="/students"
            >
              Back to roster
            </Link>
          </div>
        </form>

        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-950">Sample format</h3>
            <a
              className="text-sm font-medium text-blue-700 underline"
              download="student-import-sample.csv"
              href="/samples/student-import-sample.csv"
            >
              Download sample
            </a>
          </div>
          <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
            {sampleCsv}
          </pre>
        </aside>
      </div>
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
      disabled={pending}
      type="submit"
    >
      {pending ? "Importing…" : "Import students"}
    </button>
  );
}
