"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { RosterEntry, RosterField } from "./types";

type ServerAction = (formData: FormData) => void | Promise<void>;

type RosterFieldsGridProps = {
  createFieldAction: ServerAction;
  deleteFieldAction: ServerAction;
  fields: RosterField[];
  roster: RosterEntry[];
  saveValueAction: (fieldId: string, studentId: string, value: string) => Promise<void>;
  schoolYearId: string;
  values: Record<string, string>;
};

function cellKey(studentId: string, fieldId: string) {
  return `${studentId}:${fieldId}`;
}

function studentName(student: RosterEntry) {
  return `${student.preferredName || student.firstName} ${student.lastName}`;
}

export function RosterFieldsGrid({
  createFieldAction,
  deleteFieldAction,
  fields,
  roster,
  saveValueAction,
  schoolYearId,
  values,
}: RosterFieldsGridProps) {
  const [cellValues, setCellValues] = useState(values);
  const [cellStatus, setCellStatus] = useState<Record<string, "error" | undefined>>({});

  async function handleBlur(studentId: string, fieldId: string, value: string) {
    const key = cellKey(studentId, fieldId);
    try {
      await saveValueAction(fieldId, studentId, value);
      setCellStatus((prev) => ({ ...prev, [key]: undefined }));
    } catch {
      setCellStatus((prev) => ({ ...prev, [key]: "error" }));
    }
  }

  function handleChange(studentId: string, fieldId: string, value: string) {
    setCellValues((prev) => ({ ...prev, [cellKey(studentId, fieldId)]: value }));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // Enter acts like Tab -- saves this cell (via blur) and moves to the
    // next one -- instead of doing nothing, which is what a plain <input>
    // does by default outside a form.
    if (event.key === "Enter") {
      event.preventDefault();
      const current = event.currentTarget;
      current.blur();
      focusNextCell(current);
    }
  }

  return (
    <>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Students</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Roster quick-entry grid.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Track anything per student in a spreadsheet-style grid — textbook
            numbers, equipment loans, anything you&apos;d otherwise track on
            paper. Add a field, then tab across the row to fill it in for
            everyone. Each cell saves automatically as soon as you move to
            the next one.
          </p>
        </div>
        <Link
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          href="/students"
        >
          Back to roster
        </Link>
      </section>

      {roster.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No students yet. Add your first student before setting up fields.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="whitespace-nowrap px-3 py-2">Student</th>
                {fields.map((field) => (
                  <th className="px-3 py-2" key={field.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="normal-case text-slate-700">{field.label}</span>
                      <form
                        action={deleteFieldAction}
                        onSubmit={(event) => {
                          if (
                            !window.confirm(
                              `Remove the "${field.label}" field? This deletes every student's value for it.`,
                            )
                          ) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input name="fieldId" type="hidden" value={field.id} />
                        <button
                          aria-label={`Remove ${field.label} field`}
                          className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          type="submit"
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                        </button>
                      </form>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2">
                  <form action={createFieldAction} className="flex items-center gap-1.5">
                    <input name="schoolYearId" type="hidden" value={schoolYearId} />
                    <input
                      className="w-32 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-normal normal-case text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      name="label"
                      placeholder="e.g. Math textbook"
                      required
                      type="text"
                    />
                    <button
                      aria-label="Add field"
                      className="inline-flex shrink-0 items-center justify-center rounded-md bg-blue-600 p-1 text-white shadow-sm hover:bg-blue-700"
                      type="submit"
                    >
                      <Plus aria-hidden="true" className="size-3.5" />
                    </button>
                  </form>
                </th>
              </tr>
            </thead>
            <tbody>
              {roster.map((student) => (
                <tr className="border-b border-slate-100 last:border-0" key={student.id}>
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-950">
                    <Link className="hover:text-blue-700" href={`/students/${student.id}`}>
                      {studentName(student)}
                    </Link>
                  </td>
                  {fields.map((field) => {
                    const key = cellKey(student.id, field.id);
                    const status = cellStatus[key];

                    return (
                      <td className="px-3 py-1.5" key={field.id}>
                        <input
                          className={`w-32 rounded-md border px-2 py-1 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 ${
                            status === "error"
                              ? "border-rose-400 bg-rose-50"
                              : "border-slate-300 bg-white"
                          }`}
                          data-cell={key}
                          onBlur={(event) => handleBlur(student.id, field.id, event.target.value)}
                          onChange={(event) => handleChange(student.id, field.id, event.target.value)}
                          onKeyDown={handleKeyDown}
                          type="text"
                          value={cellValues[key] ?? ""}
                        />
                        {status === "error" ? (
                          <p className="mt-1 text-xs text-rose-600">Couldn&apos;t save — try again.</p>
                        ) : null}
                      </td>
                    );
                  })}
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {roster.length > 0 && fields.length === 0 ? (
        <p className="text-sm text-slate-500">
          No fields yet. Use the box in the top-right of the table header to
          add one, e.g. &quot;Math textbook&quot; or &quot;Chromebook #&quot;.
        </p>
      ) : null}
    </>
  );
}

function focusNextCell(current: HTMLInputElement) {
  const cells = Array.from(document.querySelectorAll<HTMLInputElement>("input[data-cell]"));
  const index = cells.indexOf(current);

  if (index === -1) {
    return;
  }

  cells[index + 1]?.focus();
}
