import type { NonInstructionalDay, SchoolYear } from "./types";
import { buildInstructionalDays } from "./timeline";

type ServerAction = (formData: FormData) => void | Promise<void>;

type CalendarSetupPageProps = {
  schoolYear: SchoolYear;
  error?: string;
  actions: {
    updateDetails: ServerAction;
    addDays: ServerAction;
    removeDay: ServerAction;
  };
};

const errorMessages: Record<string, string> = {
  details: "Check the title and that the end date is after the start date.",
  range: "Check the dates: the end date must be on or after the start date.",
  date: "Enter a valid date to block.",
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const monthFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-CA", {
  weekday: "short",
  day: "numeric",
  timeZone: "UTC",
});

function monthLabel(dateKey: string): string {
  return monthFormatter.format(new Date(`${dateKey}T00:00:00.000Z`));
}

function dayLabel(dateKey: string): string {
  return weekdayFormatter.format(new Date(`${dateKey}T00:00:00.000Z`));
}

export function CalendarSetupPage({
  schoolYear,
  error,
  actions,
}: CalendarSetupPageProps) {
  const instructionalDays = buildInstructionalDays(schoolYear);
  const groupedBlockedDays = groupByMonth(schoolYear.blockedDates);

  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">School year</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Set up the school year calendar.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Set the term dates and mark the days school is not in session.
          Weekends are excluded automatically. Non-instructional days are removed
          from the timeline and plan book counts.
        </p>
      </section>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessages[error] ?? "Please check the form and try again."}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Instructional days" value={`${instructionalDays.length}`} />
        <Metric
          label="Non-instructional days"
          value={`${schoolYear.blockedDates.length}`}
        />
        <Metric
          label="Term"
          value={`${schoolYear.startDate} → ${schoolYear.endDate}`}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">Term details</h3>
          <form action={actions.updateDetails} className="mt-3 space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Title</span>
              <input
                className={inputClass}
                defaultValue={schoolYear.title}
                name="title"
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Start date</span>
                <input
                  className={inputClass}
                  defaultValue={schoolYear.startDate}
                  name="startDate"
                  required
                  type="date"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">End date</span>
                <input
                  className={inputClass}
                  defaultValue={schoolYear.endDate}
                  name="endDate"
                  required
                  type="date"
                />
              </label>
            </div>
            <button
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
              type="submit"
            >
              Save term details
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-950">
              Non-instructional days
            </h3>
            {schoolYear.blockedDates.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No non-instructional days yet. Add holidays, PD days, and breaks
                below.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {groupedBlockedDays.map((group) => (
                  <div key={group.month}>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {group.month}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {group.days.map((day) => (
                        <li
                          className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                          key={day.date}
                        >
                          <span className="text-slate-800">
                            <span className="font-medium text-slate-950">
                              {dayLabel(day.date)}
                            </span>
                            {day.label ? (
                              <span className="text-slate-600"> · {day.label}</span>
                            ) : null}
                          </span>
                          <form action={actions.removeDay}>
                            <input name="date" type="hidden" value={day.date} />
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">
              Add non-instructional days
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Add a single day or a date range (for breaks). Weekends in a range
              are skipped automatically.
            </p>
            <form action={actions.addDays} className="mt-3 space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">From</span>
                <input
                  className={inputClass}
                  name="startDate"
                  required
                  type="date"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">
                  To (optional)
                </span>
                <input className={inputClass} name="endDate" type="date" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Label</span>
                <input
                  className={inputClass}
                  name="label"
                  placeholder="e.g. Winter Break, PD Day"
                />
              </label>
              <button
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                type="submit"
              >
                Add days
              </button>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}

function groupByMonth(
  days: NonInstructionalDay[],
): Array<{ month: string; days: NonInstructionalDay[] }> {
  const groups = new Map<string, NonInstructionalDay[]>();

  for (const day of days) {
    const key = monthLabel(day.date);
    const existing = groups.get(key);

    if (existing) {
      existing.push(day);
    } else {
      groups.set(key, [day]);
    }
  }

  return Array.from(groups, ([month, monthDays]) => ({
    month,
    days: monthDays,
  }));
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
