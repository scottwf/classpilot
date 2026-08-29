"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import {
  draftLessonSectionsAction,
  type DraftLessonSectionsResult,
} from "@/app/lessons/new/actions";
import { formatClassGrade } from "./curriculum-subjects";
import { LessonSectionFields } from "./LessonSectionFields";
import { OutcomePicker } from "./OutcomePicker";
import type { ClassSection, CurriculumOutcome, LessonPlan, UnitPlan } from "./types";

type EditableLesson = LessonPlan & { unitId: string };

type LessonFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  aiConfigured: boolean;
  classes: ClassSection[];
  error?: string;
  initialClassId?: string;
  initialDate?: string;
  initialUnitId?: string;
  lesson?: EditableLesson;
  mode: "create" | "edit";
  outcomes: CurriculumOutcome[];
  units: UnitPlan[];
};

const lessonStatuses = ["planned", "taught", "delayed", "skipped"] as const;

function classIdForUnit(units: UnitPlan[], unitId: string | undefined): string | undefined {
  return units.find((unit) => unit.id === unitId)?.classId;
}

export function LessonForm({
  action,
  aiConfigured,
  classes,
  error,
  initialClassId,
  initialDate,
  initialUnitId,
  lesson,
  mode,
  outcomes,
  units,
}: LessonFormProps) {
  const [selectedClassId, setSelectedClassId] = useState(
    classIdForUnit(units, lesson?.unitId ?? initialUnitId) ?? initialClassId ?? classes[0]?.id,
  );
  const unitOptions = units.filter((unit) => unit.classId === selectedClassId);
  const [selectedUnitId, setSelectedUnitId] = useState(
    lesson?.unitId ??
      (initialUnitId && unitOptions.some((unit) => unit.id === initialUnitId)
        ? initialUnitId
        : unitOptions[0]?.id),
  );

  const selectedClass = classes.find((section) => section.id === selectedClassId);
  const selectedClassGrades = selectedClass
    ? [selectedClass.grade, ...(selectedClass.combinedGrades ?? [])]
    : [];
  const classOutcomes = selectedClass
    ? outcomes.filter(
        (outcome) =>
          outcome.subject === selectedClass.subject && selectedClassGrades.includes(outcome.grade),
      )
    : [];

  const [draftedSections, setDraftedSections] = useState(lesson?.sections);
  const [draftedSummary, setDraftedSummary] = useState(lesson?.summary ?? "");
  const [formVersion, setFormVersion] = useState(0);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string>();

  const titleRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const outcomesContainerRef = useRef<HTMLDivElement>(null);

  function handleClassChange(classId: string) {
    setSelectedClassId(classId);
    const nextUnits = units.filter((unit) => unit.classId === classId);
    setSelectedUnitId(nextUnits[0]?.id);
  }

  async function handleDraft() {
    if (!selectedClassId || !selectedUnitId) return;

    setIsDrafting(true);
    setDraftError(undefined);

    const checkedOutcomeIds = outcomesContainerRef.current
      ? Array.from(
          outcomesContainerRef.current.querySelectorAll<HTMLInputElement>(
            'input[name="outcomeIds"]:checked',
          ),
        ).map((input) => input.value)
      : [];

    let result: DraftLessonSectionsResult;
    try {
      result = await draftLessonSectionsAction({
        classId: selectedClassId,
        lessonFocus: summaryRef.current?.value ?? "",
        lessonMinutes: Number(durationRef.current?.value) || 45,
        lessonTitle: titleRef.current?.value ?? "",
        outcomeIds: checkedOutcomeIds,
        teachingNotes: notesRef.current?.value ?? "",
        unitTitle: unitOptions.find((unit) => unit.id === selectedUnitId)?.title ?? "",
      });
    } catch {
      setIsDrafting(false);
      setDraftError("Something went wrong while drafting. Please try again.");
      return;
    }

    setIsDrafting(false);

    if (!result.ok) {
      setDraftError(result.error);
      return;
    }

    setDraftedSections(result.sections);
    setDraftedSummary(result.summary);
    setFormVersion((version) => version + 1);
  }

  return (
    <form
      action={action}
      className="grid gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      {lesson ? <input name="id" type="hidden" value={lesson.id} /> : null}

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Lesson title</span>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            defaultValue={lesson?.title}
            name="title"
            ref={titleRef}
            required
            type="text"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Date</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Leave blank to add this lesson to the unit&apos;s sequence
              without scheduling it yet.
            </span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              defaultValue={lesson?.date ?? initialDate ?? undefined}
              key={selectedUnitId}
              name="date"
              type="date"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Duration minutes
            </span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              defaultValue={lesson ? String(lesson.durationMinutes) : "55"}
              min={1}
              name="durationMinutes"
              ref={durationRef}
              required
              type="number"
            />
          </label>
          {lesson ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                defaultValue={lesson.status}
                name="status"
              >
                {lessonStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Class</span>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => handleClassChange(event.target.value)}
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
            <span className="text-sm font-medium text-slate-700">Unit</span>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              name="unitId"
              onChange={(event) => setSelectedUnitId(event.target.value)}
              required
              value={selectedUnitId ?? ""}
            >
              {unitOptions.length === 0 ? <option value="">No units for this class</option> : null}
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {unitOptions.length === 0 ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {selectedClass?.name ?? "This class"} doesn&apos;t have any units
            yet, so there&apos;s nowhere to save this lesson or draft with
            AI —{" "}
            <Link
              className="underline"
              href={`/units/new?classId=${selectedClassId ?? ""}`}
            >
              create a unit for it
            </Link>{" "}
            first, then come back and add the lesson.
          </p>
        ) : null}

        <label className="block" key={`summary-${formVersion}`}>
          <span className="text-sm font-medium text-slate-700">Summary</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            What this lesson covers, in a sentence or two. Optional, but if
            you fill it in before drafting with AI, it&apos;s used as the
            lesson&apos;s focus.
          </span>
          <textarea
            className="mt-2 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            defaultValue={draftedSummary}
            name="summary"
            ref={summaryRef}
          />
        </label>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-950">
              Draft with AI
            </h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Drafts the summary and sections below from this lesson&apos;s
            title, unit, duration, and checked outcomes. You approve and
            edit — nothing is saved until you click{" "}
            {mode === "create" ? "Save lesson" : "Save changes"}. Only
            curriculum and timing details are sent; student records are
            never included.
          </p>

          {!aiConfigured ? (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              The AI assistant is not configured yet. Set it up on the{" "}
              <Link className="underline" href="/settings">
                Settings
              </Link>{" "}
              page to enable drafting.
            </p>
          ) : (
            <>
              <label className="mt-3 block">
                <span className="text-xs font-medium text-slate-700">
                  Teaching preferences (optional)
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Style or approach, not the lesson topic — that comes from
                  the title, unit, and Summary above.
                </span>
                <textarea
                  className="mt-1 min-h-16 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  placeholder="e.g. hands-on, small groups, use the class read-aloud"
                  ref={notesRef}
                />
              </label>

              {draftError ? (
                <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {draftError}
                </p>
              ) : null}

              <button
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
                disabled={isDrafting || !selectedUnitId}
                onClick={handleDraft}
                type="button"
              >
                <Sparkles aria-hidden="true" className="size-4" />
                {isDrafting ? "Drafting…" : "Draft with AI"}
              </button>
            </>
          )}
        </div>

        <LessonSectionFields key={`sections-${formVersion}`} sections={draftedSections} />
      </div>

      <aside className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            Track outcomes
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {selectedClass
              ? `${selectedClass.subject} outcomes for Grade ${formatClassGrade(selectedClass)}.`
              : "Choose a class to see its curriculum outcomes."}
          </p>
        </div>
        <div
          className="max-h-96 overflow-y-auto rounded-lg border border-slate-200 p-2"
          ref={outcomesContainerRef}
        >
          <OutcomePicker
            emptyMessage={
              <>
                No curriculum outcomes found for {selectedClass?.subject || "this class"}
                {selectedClass ? `, Grade ${formatClassGrade(selectedClass)}` : ""}.
              </>
            }
            name="outcomeIds"
            outcomes={classOutcomes}
            selectedIds={lesson?.outcomeIds}
          />
        </div>

        {error ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Please check the lesson details and try again.
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            type="submit"
          >
            {mode === "create" ? "Save lesson" : "Save changes"}
          </button>
          <Link
            className="rounded-md px-4 py-2 text-center text-sm font-medium text-slate-600 hover:bg-slate-100"
            href="/lessons"
          >
            Cancel
          </Link>
        </div>
      </aside>
    </form>
  );
}
