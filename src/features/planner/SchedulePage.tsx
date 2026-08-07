import Link from "next/link";
import type { ClassColor, ClassSection, Period, ScheduleSlot } from "./types";

const classColorClass: Record<ClassColor, string> = {
  amber: "bg-amber-100 text-amber-950",
  blue: "bg-blue-100 text-blue-950",
  emerald: "bg-emerald-100 text-emerald-950",
  orange: "bg-orange-100 text-orange-950",
  rose: "bg-rose-100 text-rose-950",
  sky: "bg-sky-100 text-sky-950",
  teal: "bg-teal-100 text-teal-950",
  violet: "bg-violet-100 text-violet-950",
};

const classDotColorClass: Record<ClassColor, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
};

type ServerAction = (formData: FormData) => void | Promise<void>;

type SchedulePageProps = {
  actions: {
    assignSlot: ServerAction;
    createPeriod: ServerAction;
    deletePeriod: ServerAction;
    removeSlot: ServerAction;
  };
  classes: ClassSection[];
  conflictClassId?: string;
  conflictWith?: string;
  cycleLength: number;
  error?: string;
  periods: Period[];
  scheduleSlots: ScheduleSlot[];
  selectedDay: number;
  /** True when arriving from the school-year onboarding wizard — shows a
   * banner and a "Continue to review" link instead of being a standalone
   * page. See app/onboarding/. */
  wizardMode?: boolean;
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export function SchedulePage({
  actions,
  classes,
  conflictClassId,
  conflictWith,
  cycleLength,
  error,
  periods,
  scheduleSlots,
  selectedDay,
  wizardMode,
}: SchedulePageProps) {
  const dayNumbers = Array.from({ length: cycleLength }, (_, index) => index + 1);
  const conflictClass = classes.find((candidate) => candidate.id === conflictClassId);
  const daySuffix = wizardMode ? "&wizard=1" : "";

  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">Schedule</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Bell schedule and class timetable.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Set up your periods once (times are the same every cycle day), then
          assign a class to each period on each day it meets. Assigning a
          slot also marks that day as a meeting day for the class, so cascade
          rescheduling and lesson extension land on it correctly.
        </p>
      </section>

      {wizardMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-800">
            Set up periods and assign classes to the days they meet, then
            continue to review your instructional time.
          </p>
          <Link
            className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm"
            href="/onboarding/review"
          >
            Continue to review
          </Link>
        </div>
      ) : null}

      {conflictWith ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {conflictClass?.name ?? "This class"} now shares Day {selectedDay} with{" "}
          {conflictWith} in the same period. Both are saved — double-check
          that&apos;s intentional.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Please check the form and try again.
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-1 border-b border-slate-200 p-3">
            {dayNumbers.map((day) => (
              <Link
                className={[
                  "rounded-md px-3 py-2 text-sm font-medium",
                  day === selectedDay
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
                href={`/schedule?day=${day}${daySuffix}`}
                key={day}
              >
                Day {day}
              </Link>
            ))}
          </div>

          <div className="divide-y divide-slate-200">
            {periods.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">
                No periods yet. Add your bell schedule using the form on the
                right, then come back here to assign classes.
              </p>
            ) : (
              periods.map((period) => {
                const slot = scheduleSlots.find(
                  (candidate) =>
                    candidate.periodId === period.id && candidate.cycleDay === selectedDay,
                );
                const assignedClass = slot
                  ? classes.find((candidate) => candidate.id === slot.classId)
                  : undefined;

                return (
                  <div className="flex items-center gap-4 p-3" key={period.id}>
                    <div className="w-28 shrink-0 text-xs text-slate-500">
                      <div className="font-semibold text-slate-700">{period.label}</div>
                      <div>
                        {period.startTime} – {period.endTime}
                      </div>
                    </div>

                    {assignedClass ? (
                      <div
                        className={`flex flex-1 items-center justify-between gap-2 rounded-md px-3 py-2 ${classColorClass[assignedClass.color]}`}
                      >
                        <div>
                          <div className="font-medium">{assignedClass.name}</div>
                          <div className="text-xs opacity-80">{assignedClass.subject}</div>
                        </div>
                        <form action={actions.removeSlot}>
                          <input name="id" type="hidden" value={slot!.id} />
                          <input
                            name="cycleDay"
                            type="hidden"
                            value={selectedDay}
                          />
                          {wizardMode ? (
                            <input name="wizard" type="hidden" value="1" />
                          ) : null}
                          <button
                            className="text-xs font-medium opacity-80 hover:text-rose-600 hover:opacity-100"
                            type="submit"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    ) : (
                      <form
                        action={actions.assignSlot}
                        className="flex flex-1 items-center gap-2"
                      >
                        <input name="periodId" type="hidden" value={period.id} />
                        <input name="cycleDay" type="hidden" value={selectedDay} />
                        {wizardMode ? (
                          <input name="wizard" type="hidden" value="1" />
                        ) : null}
                        <select
                          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
                          defaultValue=""
                          name="classId"
                          required
                        >
                          <option disabled value="">
                            Assign a class…
                          </option>
                          {classes.map((classSection) => (
                            <option key={classSection.id} value={classSection.id}>
                              {classSection.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                          type="submit"
                        >
                          Assign
                        </button>
                      </form>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <aside className="space-y-4">
          {classes.length > 0 ? (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-950">Classes</h3>
              <ul className="mt-3 space-y-1.5">
                {classes.map((classSection) => (
                  <li className="flex items-center gap-2 text-sm text-slate-700" key={classSection.id}>
                    <span
                      aria-hidden="true"
                      className={`size-2.5 shrink-0 rounded-full ${classDotColorClass[classSection.color]}`}
                    />
                    {classSection.name}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">
              Bell schedule
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Periods and their times, the same every cycle day.
            </p>

            {periods.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {periods.map((period) => (
                  <li
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                    key={period.id}
                  >
                    <span>
                      <span className="font-medium text-slate-950">
                        {period.label}
                      </span>{" "}
                      <span className="text-slate-500">
                        {period.startTime}–{period.endTime}
                      </span>
                    </span>
                    <form action={actions.deletePeriod}>
                      <input name="id" type="hidden" value={period.id} />
                      {wizardMode ? (
                        <input name="wizard" type="hidden" value="1" />
                      ) : null}
                      <button
                        className="text-xs font-medium text-slate-400 hover:text-rose-600"
                        type="submit"
                      >
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}

            <form action={actions.createPeriod} className="mt-3 space-y-3">
              {wizardMode ? (
                <input name="wizard" type="hidden" value="1" />
              ) : null}
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Label</span>
                <input
                  className={inputClass}
                  name="label"
                  placeholder="e.g. Period 1"
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Start</span>
                  <input className={inputClass} name="startTime" required type="time" />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">End</span>
                  <input className={inputClass} name="endTime" required type="time" />
                </label>
              </div>
              <button
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                type="submit"
              >
                Add period
              </button>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
