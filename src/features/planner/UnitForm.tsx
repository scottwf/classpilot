import Link from "next/link";
import type { CurriculumOutcome, ClassSection, UnitPlan } from "./types";

type UnitFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  classes: ClassSection[];
  error?: string;
  mode: "create" | "edit";
  outcomes: CurriculumOutcome[];
  unit?: UnitPlan;
};

const colors: UnitPlan["color"][] = ["blue", "emerald", "amber", "rose", "violet"];

export function UnitForm({
  action,
  classes,
  error,
  mode,
  outcomes,
  unit,
}: UnitFormProps) {
  return (
    <form
      action={action}
      className="grid gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      {unit ? <input name="id" type="hidden" value={unit.id} /> : null}

      <div className="space-y-4">
        <Field
          defaultValue={unit?.title}
          label="Unit title"
          name="title"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            defaultValue={unit?.startDate ?? "2026-09-01"}
            label="Start date"
            name="startDate"
            required
            type="date"
          />
          <Field
            defaultValue={unit?.endDate ?? "2026-09-25"}
            label="End date"
            name="endDate"
            required
            type="date"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Subject row
            </span>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              defaultValue={unit?.classId}
              name="classId"
              required
            >
              {classes.map((classSection) => (
                <option key={classSection.id} value={classSection.id}>
                  {classSection.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Color</span>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              defaultValue={unit?.color ?? "blue"}
              name="color"
              required
            >
              {colors.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <aside className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            Unit outcomes
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Connect this unit to Grade 6 outcomes. Lesson-level outcome tracking
            builds on this foundation.
          </p>
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {outcomes.slice(0, 100).map((outcome) => (
            <label
              className="flex gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              key={outcome.id}
            >
              <input
                className="mt-1"
                defaultChecked={unit?.outcomeIds.includes(outcome.id)}
                name="outcomeIds"
                type="checkbox"
                value={outcome.id}
              />
              <span>
                <span className="font-semibold text-slate-950">
                  {outcome.code}
                </span>{" "}
                {outcome.subject}
              </span>
            </label>
          ))}
        </div>

        {error ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Please check the unit details and try again.
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            type="submit"
          >
            {mode === "create" ? "Save unit" : "Save changes"}
          </button>
          <Link
            className="rounded-md px-4 py-2 text-center text-sm font-medium text-slate-600 hover:bg-slate-100"
            href="/units"
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
  type = "text",
  ...inputProps
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        name={name}
        type={type}
        {...inputProps}
      />
    </label>
  );
}
