import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, Layers, Target } from "lucide-react";
import { buildCourseOutline } from "./lesson-queries";
import { Metric, ResourceSection } from "./LessonDetailPage";
import { lessonSectionFields } from "@/src/lib/lessons/lesson-sections";
import { getClassDotColorClass } from "./class-color";
import { InfoTip } from "./InfoTip";
import { getUnitColorClasses, getUnitShadeIndex } from "./unit-color";
import type { CurriculumOutcome, LessonPlan, PlannerData, UnitPlan } from "./types";

type OutlinePageProps = {
  data: PlannerData;
  selectedClassId?: string;
  selectedLessonId?: string;
};

export function OutlinePage({ data, selectedClassId, selectedLessonId }: OutlinePageProps) {
  const selectedClass = data.classes.find((candidate) => candidate.id === selectedClassId);
  const outline = selectedClassId ? buildCourseOutline(data.units, selectedClassId) : [];
  const selectedLessonEntry = outline
    .flatMap((entry) => entry.lessons.map((lesson) => ({ lesson, unit: entry.unit })))
    .find(({ lesson }) => lesson.id === selectedLessonId);

  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">Course outline</p>
        <h2 className="mt-1 flex items-center gap-1.5 text-2xl font-semibold text-slate-950">
          Scan a course&apos;s units and lessons at a glance.
          <InfoTip label="course outline colours">
            Each class has its own colour, and every unit inside it takes a
            shade of that colour — so the same unit is recognisable here,
            on the unit timeline, and in the plan book.
          </InfoTip>
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Pick a class, then a lesson, to see its full content without
          scrolling the whole lesson bank. For editing, scheduling, or
          attachments, open the lesson&apos;s own page.
        </p>
      </section>

      <nav aria-label="Class" className="flex flex-wrap gap-2">
        {data.classes.map((classSection) => (
          <Link
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
              classSection.id === selectedClassId
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
            href={`/outline?classId=${classSection.id}`}
            key={classSection.id}
          >
            <span
              aria-hidden="true"
              className={`size-2.5 shrink-0 rounded-full ${getClassDotColorClass(classSection.color)}`}
            />
            {classSection.name}
          </Link>
        ))}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className={selectedLessonId ? "hidden lg:block" : "block"}>
          {!selectedClass ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              Pick a class above to see its outline.
            </div>
          ) : outline.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              {selectedClass.name} doesn&apos;t have any units yet.
            </div>
          ) : (
            <div className="space-y-4">
              {outline.map(({ unit, lessons }) => (
                <div key={unit.id}>
                  {/* Issue #27: the unit heading carries the unit's own
                      shade of the class colour, so scrolling the outline
                      makes the unit boundaries obvious without reading
                      every title. */}
                  <h3
                    className={`inline-flex items-center gap-1.5 rounded-md border border-current/20 px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
                      getUnitColorClasses(
                        selectedClass?.color ?? "blue",
                        getUnitShadeIndex(unit.id, outline.map((entry) => entry.unit)),
                      ).block
                    }`}
                  >
                    <Layers aria-hidden="true" className="size-3 shrink-0" />
                    {unit.title}
                  </h3>
                  <div className="mt-2 space-y-1.5">
                    {lessons.length === 0 ? (
                      <p className="rounded-md border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
                        No lessons yet.
                      </p>
                    ) : (
                      lessons.map((lesson) => (
                        <Link
                          className={`block rounded-md border px-3 py-2 text-sm ${
                            lesson.id === selectedLessonId
                              ? "border-blue-600 bg-blue-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                          href={`/outline?classId=${selectedClassId}&lessonId=${lesson.id}`}
                          key={lesson.id}
                        >
                          <p className="truncate font-medium text-slate-950">{lesson.title}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <CalendarDays aria-hidden="true" className="size-3 shrink-0" />
                            {lesson.date ?? `Lesson ${lesson.sequence} of ${lessons.length}`}
                            {lesson.outcomeIds.length > 0 ? (
                              <>
                                <Target aria-hidden="true" className="ml-1 size-3 shrink-0" />
                                {`${lesson.outcomeIds.length} outcome${lesson.outcomeIds.length === 1 ? "" : "s"}`}
                              </>
                            ) : null}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={selectedLessonId ? "block" : "hidden lg:block"}>
          {selectedLessonEntry ? (
            <OutlineLessonDetail
              data={data}
              lesson={selectedLessonEntry.lesson}
              unit={selectedLessonEntry.unit}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Select a lesson to see its details.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function OutlineLessonDetail({
  data,
  lesson,
  unit,
}: {
  data: PlannerData;
  lesson: LessonPlan;
  unit: UnitPlan;
}) {
  const classSection = data.classes.find((candidate) => candidate.id === unit.classId);
  const outcomes = lesson.outcomeIds
    .map((outcomeId) => data.outcomes.find((outcome) => outcome.id === outcomeId))
    .filter((outcome): outcome is CurriculumOutcome => Boolean(outcome));
  const sections = lesson.sections;

  return (
    <div className="space-y-4">
      <Link
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-700 lg:hidden"
        href={`/outline?classId=${unit.classId}`}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to outline
      </Link>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p>
            <span
              className={`inline-flex items-center gap-1 rounded border border-current/20 px-1.5 py-0.5 text-xs font-medium ${
                getUnitColorClasses(
                  classSection?.color ?? "blue",
                  getUnitShadeIndex(
                    unit.id,
                    data.units.filter((candidate) => candidate.classId === unit.classId),
                  ),
                ).block
              }`}
            >
              <Layers aria-hidden="true" className="size-3 shrink-0" />
              {unit.title}
            </span>
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{lesson.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{classSection?.name ?? "Unknown class"}</p>
        </div>
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
          href={`/lessons/${lesson.id}`}
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          Open full lesson page
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Date" value={lesson.date ?? "Unscheduled"} />
        <Metric label="Duration" value={`${lesson.durationMinutes} min`} />
        <Metric label="Status" value={lesson.status} />
      </section>

      <section className="grid gap-3">
        {lessonSectionFields.map((field) => {
          const value = sections?.[field.name]?.trim();

          if (!value) {
            return null;
          }

          if (field.name === "resources") {
            return <ResourceSection key={field.name} title={field.label} value={value} />;
          }

          return (
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={field.name}>
              <h4 className="text-sm font-semibold text-slate-950">{field.label}</h4>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Outcomes</h3>
        <div className="mt-3 space-y-2">
          {outcomes.length > 0 ? (
            outcomes.map((outcome) => (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700" key={outcome.id}>
                <span className="font-semibold text-slate-950">{outcome.code}</span>{" "}
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
    </div>
  );
}
