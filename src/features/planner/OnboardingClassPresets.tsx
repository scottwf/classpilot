"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { GradeSubjects } from "./curriculum-subjects";
import {
  buildInstructionalClassPresets,
  buildNonInstructionalClassPresets,
  encodeClassPresetSelection,
  isClassPresetAlreadyAdded,
  type OnboardingClassPreset,
} from "./onboarding-class-presets";
import type { ClassSection } from "./types";

type OnboardingClassPresetsProps = {
  action: (formData: FormData) => void | Promise<void>;
  existingClasses: ClassSection[];
  gradeSubjects: GradeSubjects[];
};

const selectClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export function OnboardingClassPresets({
  action,
  existingClasses,
  gradeSubjects,
}: OnboardingClassPresetsProps) {
  const [selectedGrade, setSelectedGrade] = useState(
    gradeSubjects[0]?.grade ?? "",
  );
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const instructionalPresets = buildInstructionalClassPresets(
    gradeSubjects,
  ).filter((preset) => preset.grade === selectedGrade);
  const nonInstructionalPresets = buildNonInstructionalClassPresets();

  function setPresetSelected(preset: OnboardingClassPreset, checked: boolean) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (checked) next.add(preset.key);
      else next.delete(preset.key);
      return next;
    });
  }

  function changeGrade(grade: string) {
    setSelectedGrade(grade);
    setSelectedKeys((current) =>
      new Set(
        Array.from(current).filter((key) =>
          key.startsWith("non-instructional:"),
        ),
      ),
    );
  }

  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Quick add common classes
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Select everything you teach, then add the group at once. You can
            customize each class afterward.
          </p>
        </div>
        {gradeSubjects.length > 0 ? (
          <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-700">
            Grade
            <select
              aria-label="Grade for curriculum class suggestions"
              className={selectClass}
              onChange={(event) => changeGrade(event.target.value)}
              value={selectedGrade}
            >
              {gradeSubjects.map((entry) => (
                <option key={entry.grade} value={entry.grade}>
                  {entry.grade}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <form action={action} className="mt-4 space-y-4">
        <PresetGroup
          existingClasses={existingClasses}
          legend="Curriculum classes"
          onSelectionChange={setPresetSelected}
          presets={instructionalPresets}
          selectedKeys={selectedKeys}
        />
        <PresetGroup
          existingClasses={existingClasses}
          legend="Schedule blocks"
          onSelectionChange={setPresetSelected}
          presets={nonInstructionalPresets}
          selectedKeys={selectedKeys}
        />
        <div className="flex justify-end">
          <QuickAddButton selectedCount={selectedKeys.size} />
        </div>
      </form>
    </section>
  );
}

function PresetGroup({
  existingClasses,
  legend,
  onSelectionChange,
  presets,
  selectedKeys,
}: {
  existingClasses: ClassSection[];
  legend: string;
  onSelectionChange: (preset: OnboardingClassPreset, checked: boolean) => void;
  presets: OnboardingClassPreset[];
  selectedKeys: Set<string>;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-800">{legend}</legend>
      {presets.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          No curriculum subjects are loaded for this grade.
        </p>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {presets.map((preset) => {
            const alreadyAdded = isClassPresetAlreadyAdded(
              preset,
              existingClasses,
            );
            return (
              <label
                className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 has-checked:border-blue-600 has-checked:bg-blue-50 has-disabled:bg-slate-100 has-disabled:text-slate-400"
                key={preset.key}
              >
                <input
                  checked={selectedKeys.has(preset.key)}
                  disabled={alreadyAdded}
                  name="presets"
                  onChange={(event) =>
                    onSelectionChange(preset, event.target.checked)
                  }
                  type="checkbox"
                  value={encodeClassPresetSelection(preset)}
                />
                <span className="font-medium">{preset.name}</span>
                {alreadyAdded ? (
                  <span className="ml-auto text-xs font-medium text-emerald-700">
                    Added
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

function QuickAddButton({ selectedCount }: { selectedCount: number }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
      disabled={selectedCount === 0 || pending}
      type="submit"
    >
      {pending
        ? "Adding classes…"
        : selectedCount > 0
          ? `Add ${selectedCount} ${selectedCount === 1 ? "class" : "classes"}`
          : "Select classes to add"}
    </button>
  );
}
