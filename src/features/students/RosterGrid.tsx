"use client";

import Link from "next/link";
import { ChevronDown, Mic, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateAge } from "./age";
import type { PrimaryContact, RosterEntry, RosterField, RosterView, StudentStatus } from "./types";

type ServerAction = (formData: FormData) => void | Promise<void>;

type BuiltInColumnKey =
  | "status"
  | "birthdate"
  | "pronouns"
  | "studentNumber"
  | "contactName"
  | "contactPhone"
  | "contactEmail"
  | "followUps"
  | "reminders";

const BUILT_IN_COLUMNS: Array<{ key: BuiltInColumnKey; label: string; group: "Student" | "Contact" }> = [
  { key: "status", label: "Status", group: "Student" },
  { key: "birthdate", label: "Birthdate", group: "Student" },
  { key: "pronouns", label: "Pronouns", group: "Student" },
  { key: "studentNumber", label: "Student #", group: "Student" },
  { key: "contactName", label: "Contact name", group: "Contact" },
  { key: "contactPhone", label: "Contact phone", group: "Contact" },
  { key: "contactEmail", label: "Contact email", group: "Contact" },
  { key: "followUps", label: "Follow-ups", group: "Student" },
  { key: "reminders", label: "Reminders", group: "Student" },
];

const DEFAULT_COLUMNS: BuiltInColumnKey[] = [
  "status",
  "birthdate",
  "contactPhone",
  "contactEmail",
  "followUps",
  "reminders",
];

const readOnlyColumns = new Set<string>(["followUps", "reminders"]);
const statusOptions: StudentStatus[] = ["active", "inactive", "transferred"];

type RosterGridProps = {
  createFieldAction: ServerAction;
  createViewAction: ServerAction;
  deleteFieldAction: ServerAction;
  deleteViewAction: ServerAction;
  fields: RosterField[];
  primaryContacts: Record<string, PrimaryContact>;
  roster: RosterEntry[];
  saveContactFieldAction: (
    studentId: string,
    field: "name" | "email" | "phone",
    value: string,
  ) => Promise<void>;
  saveFieldValueAction: (fieldId: string, studentId: string, value: string) => Promise<void>;
  saveStudentFieldAction: (
    studentId: string,
    field: "status" | "birthdate" | "pronouns" | "studentNumber",
    value: string,
  ) => Promise<void>;
  schoolYearId: string;
  fieldValues: Record<string, string>;
  views: RosterView[];
};

function cellKey(column: string, studentId: string) {
  return `${column}:${studentId}`;
}

function studentName(student: RosterEntry) {
  return `${student.preferredName || student.firstName} ${student.lastName}`;
}

export function RosterGrid({
  createFieldAction,
  createViewAction,
  deleteFieldAction,
  deleteViewAction,
  fields,
  primaryContacts,
  roster,
  saveContactFieldAction,
  saveFieldValueAction,
  saveStudentFieldAction,
  schoolYearId,
  fieldValues,
  views,
}: RosterGridProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [
    ...DEFAULT_COLUMNS,
    ...fields.map((field) => `field:${field.id}`),
  ]);
  const [editMode, setEditMode] = useState(false);
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [cellStatus, setCellStatus] = useState<Record<string, "error" | undefined>>({});

  const filteredRoster = useMemo(() => {
    const query = search.trim().toLowerCase();

    return roster.filter((student) => {
      if (statusFilter !== "all" && student.status !== statusFilter) return false;
      if (query && !studentName(student).toLowerCase().includes(query)) return false;
      return true;
    });
  }, [roster, statusFilter, search]);

  function initialValue(column: string, student: RosterEntry): string {
    if (column.startsWith("field:")) {
      const fieldId = column.slice("field:".length);
      return fieldValues[`${student.id}:${fieldId}`] ?? "";
    }

    const contact = primaryContacts[student.id];

    switch (column as BuiltInColumnKey) {
      case "status":
        return student.status;
      case "birthdate":
        return student.birthdate;
      case "pronouns":
        return student.pronouns;
      case "studentNumber":
        return student.studentNumber;
      case "contactName":
        return contact?.name ?? "";
      case "contactPhone":
        return contact?.phone ?? "";
      case "contactEmail":
        return contact?.email ?? "";
      default:
        return "";
    }
  }

  function cellValue(column: string, student: RosterEntry): string {
    const key = cellKey(column, student.id);
    return overrides[key] ?? initialValue(column, student);
  }

  async function handleBlur(column: string, studentId: string, value: string) {
    const key = cellKey(column, studentId);

    try {
      if (column.startsWith("field:")) {
        await saveFieldValueAction(column.slice("field:".length), studentId, value);
      } else if (column === "contactName" || column === "contactPhone" || column === "contactEmail") {
        const contactField = column === "contactName" ? "name" : column === "contactPhone" ? "phone" : "email";
        await saveContactFieldAction(studentId, contactField, value);
      } else {
        await saveStudentFieldAction(
          studentId,
          column as "status" | "birthdate" | "pronouns" | "studentNumber",
          value,
        );
      }
      setCellStatus((prev) => ({ ...prev, [key]: undefined }));
    } catch {
      setCellStatus((prev) => ({ ...prev, [key]: "error" }));
    }
  }

  function handleChange(column: string, studentId: string, value: string) {
    setOverrides((prev) => ({ ...prev, [cellKey(column, studentId)]: value }));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      const current = event.currentTarget;
      current.blur();
      focusNextCell(current);
    }
  }

  function toggleColumn(column: string) {
    setVisibleColumns((prev) =>
      prev.includes(column) ? prev.filter((entry) => entry !== column) : [...prev, column],
    );
  }

  const orderedVisibleColumns = [
    ...BUILT_IN_COLUMNS.map((column) => column.key).filter((key) => visibleColumns.includes(key)),
    ...fields
      .map((field) => `field:${field.id}`)
      .filter((key) => visibleColumns.includes(key)),
  ];

  return (
    <>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Students</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Your private homeroom roster.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Pick which columns matter right now, save that as a view, and
            switch on edit mode to tab across a row and fill in phone
            numbers, textbook numbers, or anything else in one pass.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
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
        <>
          <section className="flex flex-wrap items-center gap-2">
            <input
              className="w-48 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name…"
              type="text"
              value={search}
            />
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setStatusFilter(event.target.value as StudentStatus | "all")}
              value={statusFilter}
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <div className="relative">
              <button
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setColumnPickerOpen((open) => !open);
                  setViewsOpen(false);
                }}
                type="button"
              >
                Columns
                <ChevronDown aria-hidden="true" className="size-3.5" />
              </button>
              {columnPickerOpen ? (
                <div className="absolute left-0 z-20 mt-1 w-64 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
                  {["Student", "Contact"].map((group) => (
                    <div className="mb-2" key={group}>
                      <p className="text-xs font-semibold uppercase text-slate-400">{group}</p>
                      {BUILT_IN_COLUMNS.filter((column) => column.group === group).map((column) => (
                        <label
                          className="mt-1 flex items-center gap-2 text-sm text-slate-700"
                          key={column.key}
                        >
                          <input
                            checked={visibleColumns.includes(column.key)}
                            onChange={() => toggleColumn(column.key)}
                            type="checkbox"
                          />
                          {column.label}
                        </label>
                      ))}
                    </div>
                  ))}
                  {fields.length > 0 ? (
                    <div className="mb-2">
                      <p className="text-xs font-semibold uppercase text-slate-400">Custom fields</p>
                      {fields.map((field) => {
                        const key = `field:${field.id}`;
                        return (
                          <div className="mt-1 flex items-center justify-between gap-2" key={field.id}>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                checked={visibleColumns.includes(key)}
                                onChange={() => toggleColumn(key)}
                                type="checkbox"
                              />
                              {field.label}
                            </label>
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
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="border-t border-slate-200 pt-2">
                    <form action={createFieldAction} className="flex items-center gap-1.5">
                      <input name="schoolYearId" type="hidden" value={schoolYearId} />
                      <input
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        name="label"
                        placeholder="New field, e.g. Chromebook #"
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
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setViewsOpen((open) => !open);
                  setColumnPickerOpen(false);
                }}
                type="button"
              >
                Views
                <ChevronDown aria-hidden="true" className="size-3.5" />
              </button>
              {viewsOpen ? (
                <div className="absolute left-0 z-20 mt-1 w-64 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
                  {views.length === 0 ? (
                    <p className="text-xs text-slate-500">No saved views yet.</p>
                  ) : (
                    views.map((view) => (
                      <div className="flex items-center justify-between gap-2 py-1" key={view.id}>
                        <button
                          className="truncate text-left text-sm text-slate-700 hover:text-blue-700"
                          onClick={() => {
                            setVisibleColumns(view.columns);
                            setViewsOpen(false);
                          }}
                          type="button"
                        >
                          {view.name}
                        </button>
                        <form action={deleteViewAction}>
                          <input name="viewId" type="hidden" value={view.id} />
                          <button
                            aria-label={`Delete ${view.name} view`}
                            className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            type="submit"
                          >
                            <Trash2 aria-hidden="true" className="size-3.5" />
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                  <div className="mt-2 border-t border-slate-200 pt-2">
                    <form action={createViewAction} className="flex items-center gap-1.5">
                      <input name="schoolYearId" type="hidden" value={schoolYearId} />
                      <input name="columns" type="hidden" value={JSON.stringify(visibleColumns)} />
                      <input
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        name="name"
                        placeholder="Save current columns as…"
                        required
                        type="text"
                      />
                      <button
                        aria-label="Save view"
                        className="inline-flex shrink-0 items-center justify-center rounded-md bg-blue-600 p-1 text-white shadow-sm hover:bg-blue-700"
                        type="submit"
                      >
                        <Plus aria-hidden="true" className="size-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              className={`ml-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm ${
                editMode
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => setEditMode((value) => !value)}
              type="button"
            >
              <Pencil aria-hidden="true" className="size-3.5" />
              {editMode ? "Editing" : "Edit mode"}
            </button>
          </section>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="whitespace-nowrap px-3 py-2">Student</th>
                  {orderedVisibleColumns.map((column) => (
                    <th className="whitespace-nowrap px-3 py-2" key={column}>
                      {columnLabel(column, fields)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((student) => (
                  <tr className="border-b border-slate-100 last:border-0" key={student.id}>
                    <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-950">
                      <Link className="hover:text-blue-700" href={`/students/${student.id}`}>
                        {studentName(student)}
                      </Link>
                      {student.status !== "active" ? (
                        <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          {student.status}
                        </span>
                      ) : null}
                    </td>
                    {orderedVisibleColumns.map((column) => {
                      const key = cellKey(column, student.id);
                      const value = cellValue(column, student);
                      const status = cellStatus[key];

                      if (readOnlyColumns.has(column)) {
                        return (
                          <td className="px-3 py-1.5" key={column}>
                            {renderBadge(column, student)}
                          </td>
                        );
                      }

                      if (!editMode) {
                        return (
                          <td className="px-3 py-1.5 text-slate-700" key={column}>
                            {renderReadOnlyValue(column, value)}
                          </td>
                        );
                      }

                      return (
                        <td className="px-3 py-1.5" key={column}>
                          {column === "status" ? (
                            <select
                              className={`w-32 rounded-md border px-2 py-1 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 ${
                                status === "error" ? "border-rose-400 bg-rose-50" : "border-slate-300 bg-white"
                              }`}
                              data-cell={key}
                              onBlur={(event) => handleBlur(column, student.id, event.target.value)}
                              onChange={(event) => {
                                handleChange(column, student.id, event.target.value);
                                void handleBlur(column, student.id, event.target.value);
                              }}
                              onKeyDown={handleKeyDown}
                              value={value}
                            >
                              {statusOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              className={`w-36 rounded-md border px-2 py-1 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 ${
                                status === "error" ? "border-rose-400 bg-rose-50" : "border-slate-300 bg-white"
                              }`}
                              data-cell={key}
                              onBlur={(event) => handleBlur(column, student.id, event.target.value)}
                              onChange={(event) => handleChange(column, student.id, event.target.value)}
                              onKeyDown={handleKeyDown}
                              type={column === "birthdate" ? "date" : column === "contactEmail" ? "email" : "text"}
                              value={value}
                            />
                          )}
                          {status === "error" ? (
                            <p className="mt-1 text-xs text-rose-600">Couldn&apos;t save — try again.</p>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function columnLabel(column: string, fields: RosterField[]): string {
  if (column.startsWith("field:")) {
    const fieldId = column.slice("field:".length);
    return fields.find((field) => field.id === fieldId)?.label ?? "Field";
  }

  return BUILT_IN_COLUMNS.find((entry) => entry.key === column)?.label ?? column;
}

function renderBadge(column: string, student: RosterEntry) {
  if (column === "followUps") {
    return student.openFollowUpCount > 0 ? (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        {student.openFollowUpCount}
      </span>
    ) : (
      <span className="text-xs text-slate-300">—</span>
    );
  }

  return student.openReminderCount > 0 ? (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
      {student.openReminderCount}
    </span>
  ) : (
    <span className="text-xs text-slate-300">—</span>
  );
}

function renderReadOnlyValue(column: string, value: string) {
  if (!value) {
    return <span className="text-slate-300">—</span>;
  }

  if (column === "contactPhone") {
    return (
      <a className="text-blue-700 hover:underline" href={`tel:${value}`}>
        {value}
      </a>
    );
  }

  if (column === "contactEmail") {
    return (
      <a className="text-blue-700 hover:underline" href={`mailto:${value}`}>
        {value}
      </a>
    );
  }

  if (column === "birthdate") {
    const age = calculateAge(value);
    return age !== undefined ? `${value} (${age})` : value;
  }

  return value;
}

function focusNextCell(current: HTMLInputElement | HTMLSelectElement) {
  const cells = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input[data-cell], select[data-cell]"),
  );
  const index = cells.indexOf(current);

  if (index === -1) {
    return;
  }

  cells[index + 1]?.focus();
}
