"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getClassMeetingDates } from "./cycle";
import { formatClassGrade } from "./curriculum-subjects";
import { computeUnitEndDate } from "./unit-pacing";
import type { CurriculumOutcome, ClassSection, SchoolYear, UnitPlan } from "./types";

type UnitFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  classes: ClassSection[];
  error?: string;
  mode: "create" | "edit";
  outcomes: CurriculumOutcome[];
  schoolYear: SchoolYear;
  unit?: UnitPlan;
  units: UnitPlan[];
};

const colors: UnitPlan["color"][] = ["blue", "emerald", "amber", "rose", "violet"];
const defaultStartDate = "2026-09-01";
const defaultLessonDays = 10;

export function UnitForm({
  action,
  classes,
  error,
  mode,
  outcomes,
  schoolYear,
  unit,
  units,
}: UnitFormProps) {
  const [selectedClassId, setSelectedClassId] = useState(
    unit?.classId ?? classes[0]?.id,
  );
  const selectedClass = classes.find((classSection) => classSection.id === selectedClassId);
  const selectedClassGrades = selectedClass
    ? [selectedClass.grade, ...(selectedClass.combinedGrades ?? [])]
    : [];
  const classOutcomes = selectedClass
    ? outcomes.filter(
        (outcome) =>
          outcome.subject === selectedClass.subject && selectedClassGrades.includes(outcome.grade),
      )
    : [];

  const meetingDates = useMemo(
    () => (selectedClass ? getClassMeetingDates(schoolYear, selectedClass) : []),
    [schoolYear, selectedClass],
  );

  const [startDate, setStartDate] = useState(unit?.startDate ?? defaultStartDate);
  const [lessonDays, setLessonDays] = useState(() => {
    if (!unit) return defaultLessonDays;
    const count = meetingDates.filter(
      (date) => date >= unit.startDate && date <= unit.endDate,
    ).length;
    return count > 0 ? count : defaultLessonDays;
  });

  const hasFutureMeetingDay = meetingDates.some((date) => date >= startDate);
  const { endDate: computedEndDate, actualLessonDays } = selectedClass
    ? computeUnitEndDate(schoolYear, selectedClass, startDate, lessonDays)
    : { endDate: startDate, actualLessonDays: 0 };

  const otherClassUnits = units.filter(
    (candidate) => candidate.classId === selectedClassId && candidate.id !== unit?.id,
  );
  const previousUnit = otherClassUnits
    .filter((candidate) => candidate.endDate < startDate)
    .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0];
  const overlappingUnit = otherClassUnits.find(
    (candidate) => candidate.startDate <= computedEndDate && candidate.endDate >= startDate,
  );

  return (
    <form
      action={action}
      className="grid gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      {unit ? <input name="id" type="hidden" value={unit.id} /> : null}

      <div className="space-y-4">
        <Field
          defaultValue={unit?.title}
          label="Unit title"
          name="title"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Start date
            </span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              name="startDate"
              onChange={(event) => setStartDate(event.target.value)}
              required
              type="date"
              value={startDate}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Lesson days
            </span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              min={1}
              onChange={(event) =>
                setLessonDays(Math.max(1, Number(event.target.value) || 1))
              }
              required
              type="number"
              value={lessonDays}
            />
          </label>
          <input name="endDate" type="hidden" value={computedEndDate} />
        </div>

        <p className="text-sm text-slate-600">
          {!hasFutureMeetingDay
            ? selectedClass
              ? "This class has no scheduled meeting days on or after the start date."
              : "Choose a class to compute the unit's end date from its schedule."
            : `Ends ${computedEndDate}${
                actualLessonDays < lessonDays
                  ? ` — only ${actualLessonDays} of ${lessonDays} lesson days fit before the end of the school year.`
                  : ` (${actualLessonDays} lesson days for this class).`
              }`}
        </p>

        {previousUnit ? (
          <p className="text-sm text-slate-600">
            {selectedClass?.name ?? "This class"}&apos;s previous unit,{" "}
            <span className="font-medium text-slate-950">{previousUnit.title}</span>, ends{" "}
            {previousUnit.endDate}.
          </p>
        ) : null}

        {overlappingUnit ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This overlaps &quot;{overlappingUnit.title}&quot; ({overlappingUnit.startDate} –{" "}
            {overlappingUnit.endDate}) for the same class.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Subject row
            </span>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              name="classId"
              onChange={(event) => setSelectedClassId(event.target.value)}
              required
              value={selectedClassId ?? ""}
            >
              {classes.map((classSection) => (
                <option key={classSection.id} value={classSection.id}>
                  {classSection.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Color</span>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              defaultValue={unit?.color ?? "blue"}
              name="color"
              required
            >
              {colors.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <aside className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            Unit outcomes
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {selectedClass
              ? `${selectedClass.subject} outcomes for Grade ${formatClassGrade(selectedClass)}. Lesson-level outcome tracking builds on this foundation.`
              : "Choose a class to see its curriculum outcomes."}
          </p>
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {classOutcomes.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-slate-500">
              No curriculum outcomes found for {selectedClass?.subject || "this class"}
              {selectedClass ? `, Grade ${formatClassGrade(selectedClass)}` : ""}. Check the
              class&apos;s subject/grade on the{" "}
              <Link className="text-blue-700 underline" href="/settings">
                Settings
              </Link>{" "}
              page.
            </p>
          ) : (
            classOutcomes.map((outcome) => (
              <label
                className="flex gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                key={outcome.id}
              >
                <input
                  className="mt-1"
                  defaultChecked={unit?.outcomeIds.includes(outcome.id)}
                  name="outcomeIds"
                  type="checkbox"
                  value={outcome.id}
                />
                <span>
                  <span className="font-semibold text-slate-950">
                    {outcome.code}
                  </span>
                  {outcome.description ? ` ${outcome.description}` : ""}
                </span>
              </label>
            ))
          )}
        </div>

        {error ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Please check the unit details and try again.
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            type="submit"
          >
            {mode === "create" ? "Save unit" : "Save changes"}
          </button>
          <Link
            className="rounded-md px-4 py-2 text-center text-sm font-medium text-slate-600 hover:bg-slate-100"
            href="/units"
          >
            Cancel
          </Link>
        </div>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...inputProps
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        name={name}
        type={type}
        {...inputProps}
      />
    </label>
  );
}
