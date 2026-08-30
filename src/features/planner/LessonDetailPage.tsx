import Link from "next/link";
import { CalendarDays, CalendarPlus, Clock3, FileText, Image, LinkIcon, Pencil } from "lucide-react";
import { AttachmentList } from "./AttachmentList";
import { parseLessonResources } from "@/src/lib/lessons/lesson-resources";
import { lessonSectionFields } from "@/src/lib/lessons/lesson-sections";
import type { Attachment, CurriculumOutcome, LessonPlan, PlannerData } from "./types";

type ServerAction = (formData: FormData) => void | Promise<void>;

type LessonDetailPageProps = {
  attachmentError?: string;
  attachments: Attachment[];
  createFileAttachmentAction: ServerAction;
  createLinkAttachmentAction: ServerAction;
  data: PlannerData;
  deleteAttachmentAction: ServerAction;
  error?: string;
  extendAction: ServerAction;
  lesson: LessonPlan & {
    unitId: string;
  };
};

export function LessonDetailPage({
  attachmentError,
  attachments,
  createFileAttachmentAction,
  createLinkAttachmentAction,
  data,
  deleteAttachmentAction,
  error,
  extendAction,
  lesson,
}: LessonDetailPageProps) {
  const unit = data.units.find((candidate) => candidate.id === lesson.unitId);
  const classSection = data.classes.find(
    (candidate) => candidate.id === unit?.classId,
  );
  const outcomes = lesson.outcomeIds
    .map((outcomeId) => data.outcomes.find((outcome) => outcome.id === outcomeId))
    .filter((outcome): outcome is CurriculumOutcome => Boolean(outcome));
  const sections = lesson.sections;
  const continuesFrom = lesson.continuesFromLessonId
    ? unit?.lessons.find((candidate) => candidate.id === lesson.continuesFromLessonId)
    : undefined;
  const continuedBy = unit?.lessons.find(
    (candidate) => candidate.continuesFromLessonId === lesson.id,
  );

  return (
    <>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Lesson plan</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {lesson.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {classSection?.name ?? "Unknown class"}
            {unit ? ` in ${unit.title}` : ""}. Use this view while teaching,
            reviewing, or preparing the lesson.
          </p>
          {continuesFrom ? (
            <p className="mt-2 text-sm text-slate-600">
              Continues from{" "}
              <Link
                className="text-blue-700 underline"
                href={`/lessons/${continuesFrom.id}`}
              >
                {continuesFrom.title}
              </Link>{" "}
              ({continuesFrom.date}).
            </p>
          ) : null}
          {continuedBy ? (
            <p className="mt-2 text-sm text-slate-600">
              Continued on{" "}
              <Link
                className="text-blue-700 underline"
                href={`/lessons/${continuedBy.id}`}
              >
                {continuedBy.date}
              </Link>
              .
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {unit ? (
            <Link
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              href={`/units/${unit.id}`}
            >
              Back to unit
            </Link>
          ) : null}
          {!continuedBy ? (
            <form action={extendAction}>
              <input name="lessonId" type="hidden" value={lesson.id} />
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                type="submit"
              >
                <CalendarPlus aria-hidden="true" className="size-4" />
                Extend to next day
              </button>
            </form>
          ) : null}
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            href={`/lessons/${lesson.id}/edit`}
          >
            <Pencil aria-hidden="true" className="size-4" />
            Edit lesson
          </Link>
        </div>
      </section>

      {error === "extend" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Couldn&apos;t extend this lesson — the class has no more meeting
          days left in the school year.
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Date" value={lesson.date ?? "Unscheduled"} />
        <Metric label="Duration" value={`${lesson.durationMinutes} min`} />
        <Metric label="Status" value={lesson.status} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-blue-700">Teaching plan</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">
              Structured lesson sections
            </h3>
          </div>

          <div className="grid gap-3">
            {lessonSectionFields.map((field) => {
              const value = sections?.[field.name]?.trim();

              if (!value) {
                return null;
              }

              if (field.name === "resources") {
                return (
                  <ResourceSection
                    key={field.name}
                    title={field.label}
                    value={value}
                  />
                );
              }

              return (
                <article
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  key={field.name}
                >
                  <h4 className="text-sm font-semibold text-slate-950">
                    {field.label}
                  </h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {value}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">
              Lesson context
            </h3>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <CalendarDays aria-hidden="true" className="size-4 text-slate-400" />
                {lesson.date}
              </div>
              <div className="flex items-center gap-2">
                <Clock3 aria-hidden="true" className="size-4 text-slate-400" />
                {lesson.durationMinutes} minutes
              </div>
              {unit ? <div>{unit.title}</div> : null}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">
              Outcomes
            </h3>
            <div className="mt-3 space-y-2">
              {outcomes.length > 0 ? (
                outcomes.map((outcome) => (
                  <div
                    className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    key={outcome.id}
                  >
                    <span className="font-semibold text-slate-950">
                      {outcome.code}
                    </span>{" "}
                    {outcome.description}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
                  No outcomes are linked to this lesson yet.
                </div>
              )}
            </div>
          </section>

          <AttachmentList
            attachments={attachments}
            createFileAction={createFileAttachmentAction}
            createLinkAction={createLinkAttachmentAction}
            deleteAction={deleteAttachmentAction}
            error={attachmentError}
            ownerId={lesson.id}
            ownerType="lesson"
          />
        </aside>
      </div>
    </>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

export function ResourceSection({ title, value }: { title: string; value: string }) {
  const resources = parseLessonResources(value);

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
      <div className="mt-3 grid gap-2">
        {resources.map((resource, index) => {
          const Icon =
            resource.kind === "image"
              ? Image
              : resource.kind === "link"
                ? LinkIcon
                : FileText;

          return (
            <div
              className="flex items-start gap-3 rounded-md bg-white px-3 py-2 text-sm text-slate-700"
              key={`${resource.label}-${index}`}
            >
              <Icon aria-hidden="true" className="mt-0.5 size-4 text-slate-400" />
              <div className="min-w-0 flex-1">
                {resource.href ? (
                  <a
                    className="break-words font-medium text-blue-700 hover:text-blue-900"
                    href={resource.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {resource.label}
                  </a>
                ) : (
                  <span className="break-words font-medium text-slate-950">
                    {resource.label}
                  </span>
                )}
                <div className="mt-1 text-xs text-slate-500">
                  {resource.kind === "attachment-note"
                    ? "Attachment note"
                    : resource.kind}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
