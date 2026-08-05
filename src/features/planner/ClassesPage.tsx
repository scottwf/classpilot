import Link from "next/link";
import { Pencil } from "lucide-react";
import type { PlannerData } from "./types";

type ServerAction = (formData: FormData) => void | Promise<void>;

type ClassesPageProps = {
  data: PlannerData;
  deleteAction: ServerAction;
};

export function ClassesPage({ data, deleteAction }: ClassesPageProps) {
  return (
    <>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Classes</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Manage your subject rows and their day-cycle schedule.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Each class is a row on the unit timeline. Set which of the
            school&apos;s {data.schoolYear.cycleLength} cycle days a class
            meets on so cascade rescheduling and AI lesson placement land on
            days it actually runs.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
          href="/classes/new"
        >
          Add class
        </Link>
      </section>

      <div className="space-y-3">
        {data.classes.map((classSection) => {
          const unitCount = data.units.filter(
            (unit) => unit.classId === classSection.id,
          ).length;
          const lessonCount = data.units
            .filter((unit) => unit.classId === classSection.id)
            .reduce((total, unit) => total + unit.lessons.length, 0);

          return (
            <article
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              key={classSection.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950">
                    {classSection.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {classSection.subject} · Grade {classSection.grade}
                    {classSection.room ? ` · ${classSection.room}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {classSection.cycleDays.length === 0
                      ? "Meets every instructional day"
                      : `Meets on Day ${classSection.cycleDays.slice().sort((a, b) => a - b).join(", ")}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    href={`/classes/${classSection.id}/edit`}
                  >
                    <Pencil aria-hidden="true" className="size-3.5" />
                    Edit
                  </Link>
                  <form action={deleteAction}>
                    <input name="id" type="hidden" value={classSection.id} />
                    <button
                      className="text-xs font-medium text-slate-400 hover:text-rose-600"
                      type="submit"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
              {unitCount > 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  Deleting also removes {unitCount} unit{unitCount === 1 ? "" : "s"}{" "}
                  and {lessonCount} lesson{lessonCount === 1 ? "" : "s"}.
                </p>
              ) : null}
            </article>
          );
        })}

        {data.classes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            No classes yet. Add one to start building units.
          </div>
        ) : null}
      </div>
    </>
  );
}
