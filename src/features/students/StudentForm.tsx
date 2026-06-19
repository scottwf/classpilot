import Link from "next/link";
import type { Student, StudentStatus } from "./types";

type StudentFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  mode: "create" | "edit";
  student?: Student;
};

const statuses: StudentStatus[] = ["active", "inactive", "transferred"];

export function StudentForm({ action, error, mode, student }: StudentFormProps) {
  const cancelHref = student ? `/students/${student.id}` : "/students";

  return (
    <form
      action={action}
      className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      {student ? <input name="id" type="hidden" value={student.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          defaultValue={student?.firstName}
          label="First name"
          name="firstName"
          required
        />
        <Field
          defaultValue={student?.lastName}
          label="Last name"
          name="lastName"
          required
        />
        <Field
          defaultValue={student?.preferredName}
          label="Preferred name"
          name="preferredName"
        />
        <Field
          defaultValue={student?.pronouns}
          label="Pronouns"
          name="pronouns"
        />
        <Field
          defaultValue={student?.birthdate}
          label="Birthdate"
          name="birthdate"
          type="date"
        />
        <Field
          defaultValue={student?.studentNumber}
          label="Student number"
          name="studentNumber"
        />
      </div>

      <Field
        defaultValue={student?.interests}
        label="Interests"
        name="interests"
      />

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Strengths</span>
        <textarea
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          defaultValue={student?.strengths}
          name="strengths"
          rows={3}
        />
      </label>

      <label className="block max-w-xs">
        <span className="text-sm font-medium text-slate-700">Status</span>
        <select
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          defaultValue={student?.status ?? "active"}
          name="status"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Please check the student details and try again.
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
          type="submit"
        >
          {mode === "create" ? "Add student" : "Save changes"}
        </button>
        <Link
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          href={cancelHref}
        >
          Cancel
        </Link>
      </div>
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
