import { notFound } from "next/navigation";
import { AppShell } from "@/src/features/planner/AppShell";
import { StudentForm } from "@/src/features/students/StudentForm";
import { requireAuth } from "@/src/lib/auth/server";
import {
  getClassPilotDatabase,
  getClassPilotPlannerData,
} from "@/src/lib/db/classpilot-db";
import { getStudentById } from "@/src/lib/db/students-repository";
import { deleteStudentAction } from "../actions";
import { updateStudentAction } from "./actions";

type EditStudentPageProps = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditStudentPage({
  params,
  searchParams,
}: EditStudentPageProps) {
  await requireAuth();

  const { studentId } = await params;
  const { error } = await searchParams;
  const student = getStudentById(getClassPilotDatabase(), studentId);

  if (!student) {
    notFound();
  }

  const plannerData = getClassPilotPlannerData();

  return (
    <AppShell activePage="students" data={plannerData}>
      <section>
        <p className="text-sm font-medium text-blue-700">Edit student</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Update {student.preferredName || student.firstName}&apos;s profile.
        </h2>
      </section>

      <StudentForm
        action={updateStudentAction}
        error={error}
        mode="edit"
        student={student}
      />

      <section className="rounded-lg border border-rose-200 bg-rose-50 p-4">
        <h3 className="text-sm font-semibold text-rose-800">Danger zone</h3>
        <p className="mt-1 text-sm text-rose-700">
          Deleting a student permanently removes their profile, contacts, notes,
          support plans, and reminders.
        </p>
        <form action={deleteStudentAction} className="mt-3">
          <input name="id" type="hidden" value={student.id} />
          <button
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
            type="submit"
          >
            Delete student
          </button>
        </form>
      </section>
    </AppShell>
  );
}
