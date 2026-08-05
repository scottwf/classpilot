import Link from "next/link";
import type { ClassSection } from "./types";

type ClassFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  classSection?: ClassSection;
  cycleLength: number;
  error?: string;
  mode: "create" | "edit";
};

export function ClassForm({
  action,
  classSection,
  cycleLength,
  error,
  mode,
}: ClassFormProps) {
  const cycleDayNumbers = Array.from({ length: cycleLength }, (_, index) => index + 1);

  return (
    <form
      action={action}
      className="grid gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      {classSection ? (
        <input name="id" type="hidden" value={classSection.id} />
      ) : null}

      <div className="space-y-4">
        <Field
          defaultValue={classSection?.name}
          label="Class name"
          name="name"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            defaultValue={classSection?.subject}
            label="Subject"
            name="subject"
            required
          />
          <Field
            defaultValue={classSection?.grade}
            label="Grade"
            name="grade"
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field defaultValue={classSection?.room} label="Room" name="room" />
          <Field
            defaultValue={classSection?.meetingPattern}
            label="Meeting pattern (free text)"
            name="meetingPattern"
            placeholder="e.g. Daily numeracy block"
          />
        </div>
      </div>

      <aside className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            Day cycle membership
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Which of the school&apos;s {cycleLength} cycle days this class
            meets on. Leave all unchecked to meet every instructional day
            (the default — most classes on a regular weekly schedule want
            this). Edit the cycle length on the{" "}
            <Link className="text-blue-700 underline" href="/calendar">
              Calendar
            </Link>{" "}
            page.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {cycleDayNumbers.map((day) => (
            <label
              className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 has-checked:border-blue-600 has-checked:bg-blue-50 has-checked:text-blue-700"
              key={day}
            >
              <input
                defaultChecked={classSection?.cycleDays.includes(day)}
                name="cycleDays"
                type="checkbox"
                value={day}
              />
              Day {day}
            </label>
          ))}
        </div>

        {error ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Please check the class details and try again.
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            type="submit"
          >
            {mode === "create" ? "Save class" : "Save changes"}
          </button>
          <Link
            className="rounded-md px-4 py-2 text-center text-sm font-medium text-slate-600 hover:bg-slate-100"
            href="/classes"
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
  ...inputProps
}: {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        name={name}
        type="text"
        {...inputProps}
      />
    </label>
  );
}
