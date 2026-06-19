import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { plannerData } from "@/src/features/planner/seed-data";
import { seedPlannerData } from "./planner-repository";
import { createClassPilotDatabase } from "./sqlite";
import {
  createContact,
  createNote,
  createReminder,
  createStudent,
  createSupportPlan,
  deleteStudent,
  getStudentProfile,
  isRosterSeeded,
  listRoster,
  setNoteFollowUpStatus,
  setReminderStatus,
  updateStudent,
} from "./students-repository";

function freshDatabase() {
  const db = createClassPilotDatabase(
    join(mkdtempSync(join(tmpdir(), "classpilot-students-")), "test.sqlite"),
  );
  // students reference school_years('current'); seed planner first.
  seedPlannerData(db, plannerData);
  return db;
}

describe("students repository", () => {
  it("creates a student and reads the full profile", () => {
    const db = freshDatabase();

    const studentId = createStudent(db, {
      firstName: "Avery",
      lastName: "Nguyen",
      preferredName: "Ave",
      strengths: "Strong collaborator.",
    });

    createContact(db, {
      studentId,
      name: "Linh Nguyen",
      relationship: "Parent",
      isPrimary: true,
    });

    createNote(db, {
      studentId,
      date: "2026-09-10",
      category: "academic",
      body: "Ready for an extension task.",
      followUpStatus: "open",
    });

    createSupportPlan(db, {
      studentId,
      planType: "accommodation",
      title: "Extended time",
    });

    createReminder(db, {
      studentId,
      dueDate: "2026-09-21",
      category: "parent_contact",
      title: "Call home",
    });

    const profile = getStudentProfile(db, studentId);

    expect(profile?.preferredName).toBe("Ave");
    expect(profile?.contacts).toHaveLength(1);
    expect(profile?.contacts[0]?.isPrimary).toBe(true);
    expect(profile?.notes).toHaveLength(1);
    expect(profile?.supportPlans[0]?.title).toBe("Extended time");
    expect(profile?.reminders[0]?.title).toBe("Call home");
  });

  it("updates a student's editable fields", () => {
    const db = freshDatabase();
    const studentId = createStudent(db, {
      firstName: "Jordan",
      lastName: "Bear",
    });

    updateStudent(db, {
      id: studentId,
      firstName: "Jordan",
      lastName: "Bear",
      pronouns: "they/them",
      status: "transferred",
    });

    const profile = getStudentProfile(db, studentId);
    expect(profile?.pronouns).toBe("they/them");
    expect(profile?.status).toBe("transferred");
  });

  it("summarizes open follow-ups and reminders on the roster", () => {
    const db = freshDatabase();
    const studentId = createStudent(db, {
      firstName: "Sofia",
      lastName: "Romero",
    });

    createNote(db, {
      studentId,
      date: "2026-09-12",
      category: "attendance",
      body: "Missed two blocks.",
      followUpStatus: "in_progress",
    });
    createReminder(db, {
      studentId,
      dueDate: "2026-09-18",
      title: "Follow up on missing work",
    });

    const entry = listRoster(db).find((student) => student.id === studentId);
    expect(entry?.openFollowUpCount).toBe(1);
    expect(entry?.openReminderCount).toBe(1);
  });

  it("closing a reminder and resolving a note clears the open counts", () => {
    const db = freshDatabase();
    const studentId = createStudent(db, {
      firstName: "Sam",
      lastName: "Lee",
    });

    const noteId = createNote(db, {
      studentId,
      date: "2026-09-12",
      category: "behavior",
      body: "Check in tomorrow.",
      followUpStatus: "open",
    });
    const reminderId = createReminder(db, {
      studentId,
      dueDate: "2026-09-18",
      title: "Email guardian",
    });

    setNoteFollowUpStatus(db, noteId, "resolved");
    setReminderStatus(db, reminderId, "done");

    const entry = listRoster(db).find((student) => student.id === studentId);
    expect(entry?.openFollowUpCount).toBe(0);
    expect(entry?.openReminderCount).toBe(0);

    const profile = getStudentProfile(db, studentId);
    expect(profile?.reminders[0]?.completedAt).not.toBe("");
  });

  it("deletes a student and cascades child records", () => {
    const db = freshDatabase();
    const studentId = createStudent(db, {
      firstName: "Riley",
      lastName: "Stone",
    });
    createContact(db, { studentId, name: "Guardian" });
    createNote(db, {
      studentId,
      date: "2026-09-12",
      category: "other",
      body: "Note body.",
    });

    deleteStudent(db, studentId);

    expect(getStudentProfile(db, studentId)).toBeUndefined();
    const contactCount = (
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM student_contacts WHERE student_id = ?",
        )
        .get(studentId) as { count: number }
    ).count;
    expect(contactCount).toBe(0);
  });

  it("reports an empty roster as not seeded", () => {
    const db = freshDatabase();
    expect(isRosterSeeded(db)).toBe(false);

    createStudent(db, { firstName: "First", lastName: "Student" });
    expect(isRosterSeeded(db)).toBe(true);
  });
});
