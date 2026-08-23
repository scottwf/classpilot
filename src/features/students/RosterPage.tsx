import Link from "next/link";
import { Mic } from "lucide-react";
import type { RosterEntry } from "./types";

type RosterPageProps = {
  roster: RosterEntry[];
};

export function RosterPage({ roster }: RosterPageProps) {
  return (
    <>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Students</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Your private homeroom roster.
          </h2>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href="/students/dictate"
          >
            <Mic aria-hidden="true" className="size-4" />
            Dictate
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href="/students/import"
          >
            Import CSV
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            href="/students/new"
          >
            Add student
          </Link>
        </div>
      </section>

      {roster.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No students yet. Add your first student to start building profiles.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roster.map((student) => (
            <li key={student.id}>
              <Link
                className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300"
                href={`/students/${student.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-950">
                    {student.preferredName || student.firstName}{" "}
                    {student.lastName}
                  </span>
                  {student.status !== "active" ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {student.status}
                    </span>
                  ) : null}
                </div>
                {student.pronouns ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {student.pronouns}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {student.openFollowUpCount > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                      {student.openFollowUpCount} follow-up
                      {student.openFollowUpCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  {student.openReminderCount > 0 ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800">
                      {student.openReminderCount} reminder
                      {student.openReminderCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
