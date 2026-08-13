import { notFound } from "next/navigation";
import { AppShell } from "@/src/features/planner/AppShell";
import { StudentProfile } from "@/src/features/students/StudentProfile";
import { requireAuth } from "@/src/lib/auth/server";
import {
  getClassPilotDatabase,
  getClassPilotPlannerData,
} from "@/src/lib/db/classpilot-db";
import { getStudentProfile } from "@/src/lib/db/students-repository";
import {
  addContactAction,
  addNoteAction,
  addReminderAction,
  addSupportPlanAction,
  deleteContactAction,
  deleteNoteAction,
  deleteReminderAction,
  deleteSupportPlanAction,
  setNoteFollowUpAction,
  setReminderStatusAction,
} from "./actions";

type StudentProfilePageProps = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export const dynamic = "force-dynamic";

export default async function StudentProfilePage({
  params,
  searchParams,
}: StudentProfilePageProps) {
  const userId = await requireAuth();

  const { studentId } = await params;
  const { error } = await searchParams;
  const profile = getStudentProfile(getClassPilotDatabase(), userId, studentId);

  if (!profile) {
    notFound();
  }

  const plannerData = getClassPilotPlannerData(userId);

  return (
    <AppShell activePage="students" data={plannerData}>
      <StudentProfile
        actions={{
          addContact: addContactAction,
          deleteContact: deleteContactAction,
          addNote: addNoteAction,
          setNoteFollowUp: setNoteFollowUpAction,
          deleteNote: deleteNoteAction,
          addSupportPlan: addSupportPlanAction,
          deleteSupportPlan: deleteSupportPlanAction,
          addReminder: addReminderAction,
          setReminderStatus: setReminderStatusAction,
          deleteReminder: deleteReminderAction,
        }}
        error={error}
        profile={profile}
      />
    </AppShell>
  );
}
