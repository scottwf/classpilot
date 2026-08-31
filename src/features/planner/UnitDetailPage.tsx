import Link from "next/link";
import { AlertTriangle, CalendarDays, Clock3, Layers, Pencil, Plus, Upload } from "lucide-react";
import { AttachmentList } from "./AttachmentList";
import { getClassDotColorClass } from "./class-color";
import { InfoTip } from "./InfoTip";
import { getUnitColorClasses, getUnitShadeIndex } from "./unit-color";
import { DeleteUnitButton } from "./DeleteUnitButton";
import { computeUnitPacing, findOverlappingUnitIds } from "./unit-pacing";
import type { Attachment, CurriculumOutcome, PlannerData, UnitPlan } from "./types";

type UnitDetailPageProps = {
  attachmentError?: string;
  attachments: Attachment[];
  autoScheduleAction: (formData: FormData) => void | Promise<void>;
  createFileAttachmentAction: (formData: FormData) => void | Promise<void>;
  createLinkAttachmentAction: (formData: FormData) => void | Promise<void>;
  data: PlannerData;
  deleteAttachmentAction: (formData: FormData) => void | Promise<void>;
  deleteUnitAction: (formData: FormData) => void | Promise<void>;
  error?: string;
  importBatchAction: (formData: FormData) => void | Promise<void>;
  imported?: string;
  importError?: string;
  importFailed?: string;
  rescheduleAction: (formData: FormData) => void | Promise<void>;
  rescheduled?: string;
  scheduled?: string;
  unit: UnitPlan;
};

export function UnitDetailPage({
  attachmentError,
  attachments,
  autoScheduleAction,
  createFileAttachmentAction,
  createLinkAttachmentAction,
  data,
  deleteAttachmentAction,
  deleteUnitAction,
  error,
  importBatchAction,
  imported,
  importError,
  importFailed,
  rescheduleAction,
  rescheduled,
  scheduled,
  unit,
}: UnitDetailPageProps) {
  const classSection = data.classes.find((candidate) => candidate.id === unit.classId);
  const unitOutcomes = unit.outcomeIds
    .map((outcomeId) => data.outcomes.find((outcome) => outcome.id === outcomeId))
    .filter((outcome): outcome is CurriculumOutcome => Boolean(outcome));
  const lessonOutcomeIds = new Set(unit.lessons.flatMap((lesson) => lesson.outcomeIds));
  const outcomesNeedingLessons = unitOutcomes.filter(
    (outcome) => !lessonOutcomeIds.has(outcome.id),
  );
  const totalLessonMinutes = unit.lessons.reduce(
    (total, lesson) => total + lesson.durationMinutes,
    0,
  );
  const pacing = classSection
    ? computeUnitPacing(unit, classSection, data.schoolYear)
    : undefined;
  const isOverlapping = findOverlappingUnitIds(data.units).has(unit.id);
  // Issue #27: this unit's shade of its class's colour, the same one the
  // unit timeline and the lesson bank show it in.
  const unitColors = getUnitColorClasses(
    classSection?.color ?? "blue",
    getUnitShadeIndex(
      unit.id,
      data.units.filter((candidate) => candidate.classId === unit.classId),
    ),
  );
  const undatedLessonCount = unit.lessons.filter((lesson) => lesson.date === null).length;

  return (
    <>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-blue-700">
            {classSection ? (
              <span
                aria-hidden="true"
                className={`size-2.5 shrink-0 rounded-full ${getClassDotColorClass(classSection.color)}`}
              />
            ) : null}
            Unit planner
            <InfoTip label="unit colours">
              This unit&apos;s colour is a shade of{" "}
              {classSection?.name ?? "its class"}&apos;s colour — you never
              pick it, so a class and its units always match across the
              timeline, plan book, and lesson bank.
            </InfoTip>
          </p>
          <h2 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold text-slate-950">
            <span
              aria-hidden="true"
              className={`inline-flex size-7 items-center justify-center rounded-md border border-current/20 ${unitColors.block}`}
            >
              <Layers className="size-4" />
            </span>
            {unit.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {classSection?.name ?? "Unknown class"} from {unit.startDate} to{" "}
            {unit.endDate}. Use this page to build the lessons and keep outcome
            coverage visible while planning.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            href={`/units/${unit.id}/edit`}
          >
            <Pencil aria-hidden="true" className="size-4" />
            Edit unit details
          </Link>
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            href={`/lessons/import?unitId=${unit.id}`}
          >
            <Upload aria-hidden="true" className="size-4" />
            Import Markdown lesson
          </Link>
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            href={`/lessons/new?unitId=${unit.id}`}
          >
            <Plus aria-hidden="true" className="size-4" />
            Add lesson to unit
          </Link>
          <DeleteUnitButton
            action={deleteUnitAction}
            lessonCount={unit.lessons.length}
            unitId={unit.id}
            unitTitle={unit.title}
          />
        </div>
      </section>

      {unit.lessons.length > 0 ? (
        <p className="-mt-2 text-xs text-slate-500">
          Deleting this unit also removes its {unit.lessons.length} lesson
          {unit.lessons.length === 1 ? "" : "s"}, including any that are
          scheduled on the plan book.
        </p>
      ) : null}

      {undatedLessonCount > 0 ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <span>
            {undatedLessonCount} lesson{undatedLessonCount === 1 ? "" : "s"} in
            this unit {undatedLessonCount === 1 ? "isn't" : "aren't"} scheduled
            yet.
          </span>
          <form action={autoScheduleAction}>
            <input name="unitId" type="hidden" value={unit.id} />
            <button
              className="inline-flex items-center justify-center rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-800 shadow-sm hover:bg-blue-100"
              type="submit"
            >
              Schedule onto {classSection?.name ?? "the class"}&apos;s next
              meeting days
            </button>
          </form>
        </section>
      ) : null}

      {rescheduled !== undefined && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {rescheduled === "0"
            ? "No lessons needed to move."
            : `Shifted ${rescheduled} lesson${rescheduled === "1" ? "" : "s"}.`}
        </div>
      )}
      {error === "shift" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Enter a non-zero whole number of instructional days to shift by.
        </div>
      )}

      {scheduled !== undefined && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {scheduled === "0"
            ? "No unscheduled lessons needed a date."
            : `Scheduled ${scheduled} lesson${scheduled === "1" ? "" : "s"} onto the class's next meeting days.`}
        </div>
      )}

      {imported !== undefined && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {imported === "0"
            ? "No lessons were imported."
            : `Imported ${imported} lesson${imported === "1" ? "" : "s"}.`}
          {importFailed ? (
            <p className="mt-1 text-rose-800">
              Failed: {importFailed}. Check each file&apos;s date, duration,
              status, and outcome codes, then re-import just those files.
            </p>
          ) : null}
        </div>
      )}
      {importError === "empty" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Choose at least one Markdown file to import.
        </div>
      )}

      {pacing?.isOverloaded ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            {pacing.scheduledLessons} lessons are planned but{" "}
            {classSection?.name ?? "this class"} only meets{" "}
            {pacing.availableMeetingDays} time
            {pacing.availableMeetingDays === 1 ? "" : "s"} between{" "}
            {unit.startDate} and {unit.endDate}. Extend the unit, trim
            lessons, or double up on a day.
          </span>
        </div>
      ) : null}

      {isOverlapping ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            This unit&apos;s dates overlap another unit on{" "}
            {classSection?.name ?? "this class"}.
          </span>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Lessons" value={`${unit.lessons.length} lessons`} />
        <Metric
          label="Outcome coverage"
          value={`${unitOutcomes.length} planned outcomes`}
        />
        <Metric
          label="Planning gap"
          value={`${outcomesNeedingLessons.length} outcomes needing lessons`}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-blue-700">Lessons</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">
                Build the unit sequence.
              </h3>
            </div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {totalLessonMinutes} min planned
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {unit.lessons.length > 0 ? (
              unit.lessons.map((lesson) => (
                <article
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  key={lesson.id}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link
                        className="font-medium text-slate-950 hover:text-blue-700"
                        href={`/lessons/${lesson.id}`}
                      >
                        {lesson.title}
                      </Link>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {lesson.summary}
                      </p>
                    </div>
                    <span className="w-fit rounded-md bg-white px-2 py-1 text-xs text-slate-600">
                      {lesson.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      {lesson.date ?? "Unscheduled"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 aria-hidden="true" className="size-3.5" />
                      {lesson.durationMinutes} min
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                No lessons have been planned for this unit yet.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">
              Unit outcomes
            </h3>
            <div className="mt-3 space-y-2">
              {unitOutcomes.map((outcome) => {
                const hasLesson = lessonOutcomeIds.has(outcome.id);

                return (
                  <div
                    className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    key={outcome.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-950">
                        {outcome.code}
                      </span>
                      <span
                        className={[
                          "rounded-md px-2 py-1 text-xs font-medium",
                          hasLesson
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700",
                        ].join(" ")}
                      >
                        {hasLesson ? "Lesson planned" : "Needs lesson"}
                      </span>
                    </div>
                    <p className="mt-2 leading-6">{outcome.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">Notes</h3>
              <Link
                className="text-xs font-medium text-blue-700 hover:text-blue-900"
                href={`/units/${unit.id}/edit`}
              >
                Edit
              </Link>
            </div>
            {unit.notes ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {unit.notes}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No notes yet — reflections on how this unit went, or ideas
                for next time, go here.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">
              Import lessons
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Import several Markdown lesson files at once, straight into
              this unit — no need to match a unit name in each file. See the{" "}
              <a
                className="font-medium text-blue-700 underline underline-offset-2"
                href="https://github.com/scottwf/classpilot/wiki/Lesson-Markdown-Format"
                rel="noreferrer"
                target="_blank"
              >
                Lesson Markdown Format
              </a>{" "}
              spec.
            </p>
            <form action={importBatchAction} className="mt-3 space-y-3">
              <input name="unitId" type="hidden" value={unit.id} />
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Markdown files
                </span>
                <input
                  accept=".md,text/markdown,text/plain"
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
                  multiple
                  name="lessonFiles"
                  type="file"
                />
              </label>
              <button
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                type="submit"
              >
                Import lessons
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">
              Shift lessons
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Moved a lesson or missed a day? Push every lesson on or after a
              date forward (or pull them back) by a number of instructional
              days — nothing before that date changes.
            </p>
            <form action={rescheduleAction} className="mt-3 space-y-3">
              <input name="unitId" type="hidden" value={unit.id} />
              <label className="block text-sm font-medium text-slate-700">
                On or after
                <input
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                  name="fromDate"
                  required
                  type="date"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Shift by (instructional days)
                <input
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
                  name="shiftByDays"
                  placeholder="e.g. 1, or -1 to pull earlier"
                  required
                  step="1"
                  type="number"
                />
              </label>
              <button
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                type="submit"
              >
                Shift lessons
              </button>
            </form>
          </section>

          <AttachmentList
            attachments={attachments}
            createFileAction={createFileAttachmentAction}
            createLinkAction={createLinkAttachmentAction}
            deleteAction={deleteAttachmentAction}
            error={attachmentError}
            ownerId={unit.id}
            ownerType="unit"
          />
        </aside>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}
