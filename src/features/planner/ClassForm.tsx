import Link from "next/link";
import { classColorPalette, pickUnusedClassColor } from "./class-color";
import { getDayLabel } from "./cycle";
import type { GradeSubjects } from "./curriculum-subjects";
import type { ClassColor, ClassSection, DayLabelScheme } from "./types";

type ClassFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  classSection?: ClassSection;
  cycleLength: number;
  dayLabelScheme: DayLabelScheme;
  error?: string;
  /** Other classes already in the active year — used to default a new
   * class's color to one not already in use. */
  existingClasses: ClassSection[];
  /** Grades and subjects that have curriculum outcomes loaded — populates
   * the instructional-class curriculum picker below. */
  gradeSubjects: GradeSubjects[];
  mode: "create" | "edit";
};

const classColors = classColorPalette;

const classColorSwatchClass: Record<ClassColor, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  teal: "bg-teal-500",
  violet: "bg-violet-500",
};

export function ClassForm({
  action,
  classSection,
  cycleLength,
  dayLabelScheme,
  error,
  existingClasses,
  gradeSubjects,
  mode,
}: ClassFormProps) {
  const cycleDayNumbers = Array.from({ length: cycleLength }, (_, index) => index + 1);
  const selectedColor = classSection?.color ?? pickUnusedClassColor(existingClasses);
  const isInstructional = classSection?.isInstructional ?? true;
  const curriculumChoice =
    classSection && isInstructional
      ? `${classSection.grade}|${classSection.subject}`
      : "";
  const curriculumChoiceExists = gradeSubjects.some(
    (entry) =>
      entry.grade === classSection?.grade && entry.subjects.includes(classSection?.subject ?? ""),
  );

  return (
    <form
      action={action}
      className="grid gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      {classSection ? (
        <>
          <input name="id" type="hidden" value={classSection.id} />
          <input name="schoolYearId" type="hidden" value={classSection.schoolYearId} />
        </>
      ) : null}

      <div className="space-y-4">
        <Field
          defaultValue={classSection?.name}
          label="Class name"
          name="name"
          required
        />
        <div>
          <input
            className="peer"
            defaultChecked={isInstructional}
            id="isInstructional"
            name="isInstructional"
            type="checkbox"
            value="1"
          />
          <label
            className="ml-2 text-sm font-medium text-slate-700"
            htmlFor="isInstructional"
          >
            This is an instructional class (has curriculum outcomes)
          </label>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Uncheck for non-instructional blocks on the schedule — recess,
            supervision, a one-off assembly — which skip curriculum outcomes
            and instructional-time tracking.
          </p>

          <div className="mt-3 hidden peer-checked:block">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Grade and subject
              </span>
              <select
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                defaultValue={curriculumChoiceExists ? curriculumChoice : ""}
                name="curriculumChoice"
              >
                <option value="">Select a subject…</option>
                {gradeSubjects.map((entry) => (
                  <optgroup key={entry.grade} label={`Grade ${entry.grade}`}>
                    {entry.subjects.map((subject) => (
                      <option key={subject} value={`${entry.grade}|${subject}`}>
                        {subject}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                From curriculum outcomes already loaded on the{" "}
                <Link className="text-blue-700 underline" href="/outcomes">
                  Outcomes
                </Link>{" "}
                page.
              </span>
            </label>
          </div>

          <div className="mt-3 grid gap-4 peer-checked:hidden sm:grid-cols-2">
            <Field
              defaultValue={isInstructional ? undefined : classSection?.subject}
              label="Subject or label"
              name="subjectFreeText"
              placeholder="e.g. Recess, Supervision"
            />
            <Field
              defaultValue={isInstructional ? undefined : classSection?.grade}
              label="Grade (optional)"
              name="gradeFreeText"
            />
          </div>
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
              {getDayLabel(dayLabelScheme, day)}
            </label>
          ))}
        </div>

        <div>
          <span className="text-sm font-medium text-slate-700">Color</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {classColors.map((color) => (
              <label
                className="flex items-center"
                key={color}
                title={color}
              >
                <input
                  className="peer sr-only"
                  defaultChecked={color === selectedColor}
                  name="color"
                  type="radio"
                  value={color}
                />
                <span
                  className={`size-7 cursor-pointer rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-blue-600 ${classColorSwatchClass[color]}`}
                />
              </label>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Target instructional minutes per year (optional)
          </span>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            defaultValue={classSection?.targetMinutesPerYear}
            min={1}
            name="targetMinutesPerYear"
            placeholder="e.g. 5400 for a curriculum minimum"
            type="number"
          />
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Compared against actual scheduled time on the school-year setup
            summary. Leave blank if you don&apos;t have a target to check
            against.
          </span>
        </label>

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
