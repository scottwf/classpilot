// @vitest-environment node
//
// Vitest's default environment (jsdom, set globally in vitest.config.ts) is a
// browser-like sandbox that can't bundle the Node-only `node:sqlite` module
// this file (transitively) imports. Force the real Node environment here.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { plannerData } from "@/src/features/planner/seed-data";
import { seedPlannerData } from "./planner-repository";
import { createClassPilotDatabase } from "./sqlite";
import { createUser } from "./users-repository";
import {
  createContact,
  createNote,
  createReminder,
  createStudent,
  createSupportPlan,
  deleteStudent,
  getPrimaryContactMap,
  getStudentProfile,
  isRosterSeeded,
  listRoster,
  setNoteFollowUpStatus,
  setPrimaryContactField,
  setReminderStatus,
  updateContact,
  updateStudent,
  updateStudentField,
} from "./students-repository";

function freshDatabase() {
  const db = createClassPilotDatabase(
    join(mkdtempSync(join(tmpdir(), "classpilot-students-")), "test.sqlite"),
  );
  const userId = createUser(db, { username: "teacher", password: "x" }).id;
  // students reference school_years('current'); seed planner first.
  seedPlannerData(db, userId, plannerData);
  return { db, userId };
}

describe("students repository", () => {
  it("creates a student and reads the full profile", () => {
    const { db, userId } = freshDatabase();

    const studentId = createStudent(db, userId, {
      schoolYearId: "current",
      firstName: "Avery",
      lastName: "Nguyen",
      preferredName: "Ave",
      strengths: "Strong collaborator.",
    });

    createContact(db, userId, {
      studentId,
      name: "Linh Nguyen",
      relationship: "Parent",
      isPrimary: true,
    });

    createNote(db, userId, {
      studentId,
      date: "2026-09-10",
      category: "academic",
      body: "Ready for an extension task.",
      followUpStatus: "open",
    });

    createSupportPlan(db, userId, {
      studentId,
      planType: "accommodation",
      title: "Extended time",
    });

    createReminder(db, userId, {
      studentId,
      dueDate: "2026-09-21",
      category: "parent_contact",
      title: "Call home",
    });

    const profile = getStudentProfile(db, userId, studentId);

    expect(profile?.preferredName).toBe("Ave");
    expect(profile?.contacts).toHaveLength(1);
    expect(profile?.contacts[0]?.isPrimary).toBe(true);
    expect(profile?.notes).toHaveLength(1);
    expect(profile?.supportPlans[0]?.title).toBe("Extended time");
    expect(profile?.reminders[0]?.title).toBe("Call home");
  });

  it("updates a student's editable fields", () => {
    const { db, userId } = freshDatabase();
    const studentId = createStudent(db, userId, {
      schoolYearId: "current",
      firstName: "Jordan",
      lastName: "Bear",
    });

    updateStudent(db, userId, {
      id: studentId,
      firstName: "Jordan",
      lastName: "Bear",
      pronouns: "they/them",
      status: "transferred",
    });

    const profile = getStudentProfile(db, userId, studentId);
    expect(profile?.pronouns).toBe("they/them");
    expect(profile?.status).toBe("transferred");
  });

  it("patches a single field via updateStudentField without touching the rest", () => {
    const { db, userId } = freshDatabase();
    const studentId = createStudent(db, userId, {
      schoolYearId: "current",
      firstName: "Jordan",
      lastName: "Bear",
      pronouns: "they/them",
    });

    updateStudentField(db, userId, studentId, "birthdate", "2016-04-02");

    const profile = getStudentProfile(db, userId, studentId);
    expect(profile?.birthdate).toBe("2016-04-02");
    expect(profile?.pronouns).toBe("they/them");
    expect(profile?.firstName).toBe("Jordan");
  });

  it("rejects updateStudentField for a student owned by another user (IDOR check)", () => {
    const { db, userId } = freshDatabase();
    const otherUserId = createUser(db, { username: "other", password: "x" }).id;
    const studentId = createStudent(db, userId, {
      schoolYearId: "current",
      firstName: "Jordan",
      lastName: "Bear",
    });

    expect(() =>
      updateStudentField(db, otherUserId, studentId, "birthdate", "2016-04-02"),
    ).toThrow("not found");
  });

  it("updates an existing contact in place", () => {
    const { db, userId } = freshDatabase();
    const studentId = createStudent(db, userId, {
      schoolYearId: "current",
      firstName: "Jordan",
      lastName: "Bear",
    });
    const contactId = createContact(db, userId, {
      studentId,
      name: "Sam Bear",
      email: "sam@example.com",
      isPrimary: true,
    });

    updateContact(db, userId, {
      id: contactId,
      studentId,
      name: "Sam Bear",
      email: "sam@example.com",
      phone: "555-0100",
      isPrimary: true,
    });

    const profile = getStudentProfile(db, userId, studentId);
    expect(profile?.contacts).toHaveLength(1);
    expect(profile?.contacts[0].phone).toBe("555-0100");
  });

  it("sets a primary contact field, creating the contact if none exists", () => {
    const { db, userId } = freshDatabase();
    const studentId = createStudent(db, userId, {
      schoolYearId: "current",
      firstName: "Jordan",
      lastName: "Bear",
    });

    setPrimaryContactField(db, userId, studentId, "phone", "555-0100");

    expect(getPrimaryContactMap(db, userId, "current")).toEqual({
      [studentId]: { id: expect.any(String), name: "", email: "", phone: "555-0100" },
    });

    setPrimaryContactField(db, userId, studentId, "email", "sam@example.com");

    expect(getPrimaryContactMap(db, userId, "current")).toEqual({
      [studentId]: {
        id: expect.any(String),
        name: "",
        email: "sam@example.com",
        phone: "555-0100",
      },
    });

    const profile = getStudentProfile(db, userId, studentId);
    expect(profile?.contacts).toHaveLength(1);
  });

  it("summarizes open follow-ups and reminders on the roster", () => {
    const { db, userId } = freshDatabase();
    const studentId = createStudent(db, userId, {
      schoolYearId: "current",
      firstName: "Sofia",
      lastName: "Romero",
    });

    createNote(db, userId, {
      studentId,
      date: "2026-09-12",
      category: "attendance",
      body: "Missed two blocks.",
      followUpStatus: "in_progress",
    });
    createReminder(db, userId, {
      studentId,
      dueDate: "2026-09-18",
      title: "Follow up on missing work",
    });

    const entry = listRoster(db, userId, "current").find((student) => student.id === studentId);
    expect(entry?.openFollowUpCount).toBe(1);
    expect(entry?.openReminderCount).toBe(1);
  });

  it("closing a reminder and resolving a note clears the open counts", () => {
    const { db, userId } = freshDatabase();
    const studentId = createStudent(db, userId, {
      schoolYearId: "current",
      firstName: "Sam",
      lastName: "Lee",
    });

    const noteId = createNote(db, userId, {
      studentId,
      date: "2026-09-12",
      category: "behavior",
      body: "Check in tomorrow.",
      followUpStatus: "open",
    });
    const reminderId = createReminder(db, userId, {
      studentId,
      dueDate: "2026-09-18",
      title: "Email guardian",
    });

    setNoteFollowUpStatus(db, userId, noteId, "resolved");
    setReminderStatus(db, userId, reminderId, "done");

    const entry = listRoster(db, userId, "current").find((student) => student.id === studentId);
    expect(entry?.openFollowUpCount).toBe(0);
    expect(entry?.openReminderCount).toBe(0);

    const profile = getStudentProfile(db, userId, studentId);
    expect(profile?.reminders[0]?.completedAt).not.toBe("");
  });

  it("deletes a student and cascades child records", () => {
    const { db, userId } = freshDatabase();
    const studentId = createStudent(db, userId, {
      schoolYearId: "current",
      firstName: "Riley",
      lastName: "Stone",
    });
    createContact(db, userId, { studentId, name: "Guardian" });
    createNote(db, userId, {
      studentId,
      date: "2026-09-12",
      category: "other",
      body: "Note body.",
    });

    deleteStudent(db, userId, studentId);

    expect(getStudentProfile(db, userId, studentId)).toBeUndefined();
    const contactCount = (
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM student_contacts WHERE student_id = ?",
        )
        .get(studentId) as { count: number }
    ).count;
    expect(contactCount).toBe(0);
  });

  it("encrypts sensitive fields at rest but reads them back as plaintext", () => {
    const { db, userId } = freshDatabase();
    const studentId = createStudent(db, userId, {
      schoolYearId: "current",
      firstName: "Casey",
      lastName: "Vargas",
      strengths: "Resilient and curious.",
      birthdate: "2014-03-02",
    });
    const noteId = createNote(db, userId, {
      studentId,
      date: "2026-09-15",
      category: "medical",
      body: "Carries an inhaler; keep accessible during PE.",
    });

    const rawStrengths = (
      db
        .prepare("SELECT strengths FROM students WHERE id = ?")
        .get(studentId) as { strengths: string }
    ).strengths;
    const rawBody = (
      db
        .prepare("SELECT body FROM student_notes WHERE id = ?")
        .get(noteId) as { body: string }
    ).body;

    expect(rawStrengths.startsWith("v1:")).toBe(true);
    expect(rawStrengths).not.toContain("Resilient");
    expect(rawBody).not.toContain("inhaler");

    const profile = getStudentProfile(db, userId, studentId);
    expect(profile?.strengths).toBe("Resilient and curious.");
    expect(profile?.birthdate).toBe("2014-03-02");
    expect(profile?.notes[0]?.body).toBe(
      "Carries an inhaler; keep accessible during PE.",
    );
  });

  it("reports an empty roster as not seeded", () => {
    const { db, userId } = freshDatabase();
    expect(isRosterSeeded(db)).toBe(false);

    createStudent(db, userId, {
      schoolYearId: "current", firstName: "First", lastName: "Student" });
    expect(isRosterSeeded(db)).toBe(true);
  });
});
