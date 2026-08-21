import { CalendarGrid } from "./CalendarGrid";
import type { SchoolYear } from "./types";
import { buildInstructionalDays } from "./timeline";

type ServerAction = (formData: FormData) => void | Promise<void>;

type CalendarSetupPageProps = {
  schoolYear: SchoolYear;
  error?: string;
  feedUrl: string;
  actions: {
    updateDetails: ServerAction;
    updateBlockedDates: ServerAction;
    cancelDay: ServerAction;
  };
};

const errorMessages: Record<string, string> = {
  details: "Check the title, that the end date is after the start date, and that the cycle length is a whole number of at least 1.",
  date: "Enter a valid date.",
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export function CalendarSetupPage({
  schoolYear,
  error,
  feedUrl,
  actions,
}: CalendarSetupPageProps) {
  const instructionalDays = buildInstructionalDays(schoolYear);

  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">Calendar</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          {schoolYear.title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Weekends are excluded automatically. Non-instructional days are
          removed from the timeline and plan book counts. Switch or manage
          school years from{" "}
          <a className="text-blue-700 underline" href="/settings">
            Settings
          </a>
          .
        </p>
      </section>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessages[error] ?? "Please check the form and try again."}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Instructional days" value={`${instructionalDays.length}`} />
        <Metric
          label="Non-instructional days"
          value={`${schoolYear.blockedDates.length}`}
        />
        <Metric
          label="Term"
          value={`${schoolYear.startDate} → ${schoolYear.endDate}`}
        />
        <Metric label="Day cycle length" value={`${schoolYear.cycleLength} days`} />
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
            <label className="block text-sm">
              <span className="font-medium text-slate-700">
                Day cycle length
              </span>
              <input
                className={inputClass}
                defaultValue={schoolYear.cycleLength}
                min={1}
                name="cycleLength"
                required
                step={1}
                type="number"
              />
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                How many days before your division&apos;s day cycle repeats —
                2 for odd/even days, 5 or 6 for a rotating cycle. Classes are
                assigned specific cycle days on the Schedule page.
              </span>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">
                Cycle day labels
              </span>
              <select
                className={inputClass}
                defaultValue={schoolYear.dayLabelScheme}
                name="dayLabelScheme"
              >
                <option value="numeric">Numeric — Day 1, Day 2...</option>
                <option value="letters">Letters — Day A, Day B...</option>
                <option value="odd-even">Odd/Even — for a 2-day cycle</option>
              </select>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Purely how cycle days are displayed — doesn&apos;t change how
                scheduling works.
              </span>
            </label>
            <button
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
              type="submit"
            >
              Save term details
            </button>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">
              Cancel a school day
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              For snow days and other same-day emergency closures. Unlike
              the calendar below, this always pauses the day cycle —
              whatever was scheduled just moves to the next school day
              instead of being skipped.
            </p>
            <form action={actions.cancelDay} className="mt-3 space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Date</span>
                <input className={inputClass} name="date" required type="date" />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">
                  Label (optional)
                </span>
                <input
                  className={inputClass}
                  name="label"
                  placeholder="Snow day"
                />
              </label>
              <button
                className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 shadow-sm"
                type="submit"
              >
                Cancel this day
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">
              Subscribe to lessons in your calendar
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Add this URL as a &quot;subscribe by URL&quot; calendar in
              Apple/Google/Outlook Calendar for a read-only, always-current
              view of every scheduled lesson. This link contains a private
              token — don&apos;t share it publicly. Subscribing from Google
              Calendar specifically requires this URL to be reachable from
              Google&apos;s servers, not just your device.
            </p>
            <input
              className={`${inputClass} mt-3 font-mono text-xs`}
              readOnly
              value={feedUrl}
            />
          </section>
        </aside>
      </div>

      <form action={actions.updateBlockedDates} className="space-y-5">
        <CalendarGrid
          cycleLength={schoolYear.cycleLength}
          dayLabelScheme={schoolYear.dayLabelScheme}
          endDate={schoolYear.endDate}
          hiddenInputName="blockedDatesJson"
          initialBlockedDates={schoolYear.blockedDates}
          startDate={schoolYear.startDate}
          leftColumn={
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-950">
                Non-instructional days
              </h3>
              <p className="text-xs leading-5 text-slate-500">
                Click a day to mark it as a holiday, PD day, or other
                non-instructional day. Shift-click a second day to select a
                whole range at once (e.g. the first and last day of a
                break). Changes here aren&apos;t saved until you click Save.
              </p>
              <button
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                type="submit"
              >
                Save calendar changes
              </button>
            </div>
          }
        />
      </form>
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
