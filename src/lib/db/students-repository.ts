import type {
  FollowUpStatus,
  Reminder,
  ReminderCategory,
  ReminderStatus,
  RosterEntry,
  Student,
  StudentContact,
  StudentNote,
  StudentProfile,
  StudentStatus,
  SupportPlan,
  SupportPlanStatus,
  SupportPlanType,
  NoteCategory,
} from "@/src/features/students/types";
import { decryptField, encryptField } from "@/src/lib/crypto/field-cipher";
import type { ClassPilotDatabase } from "./sqlite";

const defaultSchoolYearId = "current";

type StudentRow = {
  id: string;
  school_year_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string;
  pronouns: string;
  birthdate: string;
  student_number: string;
  strengths: string;
  interests: string;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
};

type StudentContactRow = {
  id: string;
  student_id: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  is_primary: number;
  is_emergency: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

type StudentNoteRow = {
  id: string;
  student_id: string;
  date: string;
  category: NoteCategory;
  subject: string;
  body: string;
  follow_up_status: FollowUpStatus;
  unit_id: string | null;
  lesson_id: string | null;
  created_at: string;
  updated_at: string;
};

type SupportPlanRow = {
  id: string;
  student_id: string;
  plan_type: SupportPlanType;
  title: string;
  details: string;
  strategies: string;
  start_date: string;
  review_date: string;
  status: SupportPlanStatus;
  created_at: string;
  updated_at: string;
};

type ReminderRow = {
  id: string;
  student_id: string | null;
  due_date: string;
  category: ReminderCategory;
  title: string;
  details: string;
  status: ReminderStatus;
  source_note_id: string | null;
  created_at: string;
  completed_at: string;
};

export type CreateStudentInput = {
  firstName: string;
  lastName: string;
  preferredName?: string;
  pronouns?: string;
  birthdate?: string;
  studentNumber?: string;
  strengths?: string;
  interests?: string;
  status?: StudentStatus;
  schoolYearId?: string;
};

export type UpdateStudentInput = CreateStudentInput & {
  id: string;
};

export type CreateContactInput = {
  studentId: string;
  name: string;
  relationship?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  isEmergency?: boolean;
  notes?: string;
};

export type CreateNoteInput = {
  studentId: string;
  date: string;
  category: NoteCategory;
  subject?: string;
  body: string;
  followUpStatus?: FollowUpStatus;
  unitId?: string;
  lessonId?: string;
};

export type CreateSupportPlanInput = {
  studentId: string;
  planType: SupportPlanType;
  title: string;
  details?: string;
  strategies?: string;
  startDate?: string;
  reviewDate?: string;
  status?: SupportPlanStatus;
};

export type CreateReminderInput = {
  studentId?: string;
  dueDate: string;
  category?: ReminderCategory;
  title: string;
  details?: string;
  sourceNoteId?: string;
};

function now(): string {
  return new Date().toISOString();
}

export function listRoster(
  db: ClassPilotDatabase,
  schoolYearId: string = defaultSchoolYearId,
): RosterEntry[] {
  const rows = db
    .prepare(
      `SELECT * FROM students WHERE school_year_id = ? ORDER BY last_name, first_name`,
    )
    .all(schoolYearId) as StudentRow[];

  return rows.map((row) => {
    const openReminderCount = (
      db
        .prepare(
          `SELECT COUNT(*) AS count FROM reminders WHERE student_id = ? AND status = 'open'`,
        )
        .get(row.id) as { count: number }
    ).count;

    const openFollowUpCount = (
      db
        .prepare(
          `SELECT COUNT(*) AS count FROM student_notes WHERE student_id = ? AND follow_up_status IN ('open', 'in_progress')`,
        )
        .get(row.id) as { count: number }
    ).count;

    return {
      ...mapStudent(row),
      openReminderCount,
      openFollowUpCount,
    };
  });
}

export function getStudentById(
  db: ClassPilotDatabase,
  id: string,
): Student | undefined {
  const row = db.prepare(`SELECT * FROM students WHERE id = ?`).get(id) as
    | StudentRow
    | undefined;

  return row ? mapStudent(row) : undefined;
}

export function getStudentProfile(
  db: ClassPilotDatabase,
  id: string,
): StudentProfile | undefined {
  const student = getStudentById(db, id);

  if (!student) {
    return undefined;
  }

  const contacts = db
    .prepare(
      `SELECT * FROM student_contacts WHERE student_id = ? ORDER BY is_primary DESC, name`,
    )
    .all(id) as StudentContactRow[];

  const notes = db
    .prepare(
      `SELECT * FROM student_notes WHERE student_id = ? ORDER BY date DESC, rowid DESC`,
    )
    .all(id) as StudentNoteRow[];

  const supportPlans = db
    .prepare(
      `SELECT * FROM support_plans WHERE student_id = ? ORDER BY status, review_date`,
    )
    .all(id) as SupportPlanRow[];

  const reminders = db
    .prepare(
      `SELECT * FROM reminders WHERE student_id = ? ORDER BY status, due_date`,
    )
    .all(id) as ReminderRow[];

  return {
    ...student,
    contacts: contacts.map(mapContact),
    notes: notes.map(mapNote),
    supportPlans: supportPlans.map(mapSupportPlan),
    reminders: reminders.map(mapReminder),
  };
}

export function createStudent(
  db: ClassPilotDatabase,
  input: CreateStudentInput,
): string {
  const id = `student-${crypto.randomUUID()}`;
  const timestamp = now();

  db.prepare(
    `INSERT INTO students (id, school_year_id, first_name, last_name, preferred_name, pronouns, birthdate, student_number, strengths, interests, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.schoolYearId ?? defaultSchoolYearId,
    input.firstName,
    input.lastName,
    input.preferredName ?? "",
    input.pronouns ?? "",
    encryptField(input.birthdate ?? ""),
    encryptField(input.studentNumber ?? ""),
    encryptField(input.strengths ?? ""),
    input.interests ?? "",
    input.status ?? "active",
    timestamp,
    timestamp,
  );

  return id;
}

export function updateStudent(
  db: ClassPilotDatabase,
  input: UpdateStudentInput,
) {
  const result = db
    .prepare(
      `UPDATE students
       SET first_name = ?, last_name = ?, preferred_name = ?, pronouns = ?, birthdate = ?, student_number = ?, strengths = ?, interests = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.firstName,
      input.lastName,
      input.preferredName ?? "",
      input.pronouns ?? "",
      encryptField(input.birthdate ?? ""),
      encryptField(input.studentNumber ?? ""),
      encryptField(input.strengths ?? ""),
      input.interests ?? "",
      input.status ?? "active",
      now(),
      input.id,
    );

  if (result.changes === 0) {
    throw new Error(`Student not found: ${input.id}`);
  }
}

export function deleteStudent(db: ClassPilotDatabase, id: string) {
  const result = db.prepare(`DELETE FROM students WHERE id = ?`).run(id);

  if (result.changes === 0) {
    throw new Error(`Student not found: ${id}`);
  }
}

export function createContact(
  db: ClassPilotDatabase,
  input: CreateContactInput,
): string {
  const id = `contact-${crypto.randomUUID()}`;
  const timestamp = now();

  db.prepare(
    `INSERT INTO student_contacts (id, student_id, name, relationship, email, phone, is_primary, is_emergency, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.studentId,
    input.name,
    input.relationship ?? "",
    encryptField(input.email ?? ""),
    encryptField(input.phone ?? ""),
    input.isPrimary ? 1 : 0,
    input.isEmergency ? 1 : 0,
    encryptField(input.notes ?? ""),
    timestamp,
    timestamp,
  );

  return id;
}

export function deleteContact(db: ClassPilotDatabase, id: string) {
  db.prepare(`DELETE FROM student_contacts WHERE id = ?`).run(id);
}

export function createNote(
  db: ClassPilotDatabase,
  input: CreateNoteInput,
): string {
  const id = `note-${crypto.randomUUID()}`;
  const timestamp = now();

  db.prepare(
    `INSERT INTO student_notes (id, student_id, date, category, subject, body, follow_up_status, unit_id, lesson_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.studentId,
    input.date,
    input.category,
    input.subject ?? "",
    encryptField(input.body),
    input.followUpStatus ?? "none",
    input.unitId ?? null,
    input.lessonId ?? null,
    timestamp,
    timestamp,
  );

  return id;
}

export function setNoteFollowUpStatus(
  db: ClassPilotDatabase,
  id: string,
  followUpStatus: FollowUpStatus,
) {
  db.prepare(
    `UPDATE student_notes SET follow_up_status = ?, updated_at = ? WHERE id = ?`,
  ).run(followUpStatus, now(), id);
}

export function deleteNote(db: ClassPilotDatabase, id: string) {
  db.prepare(`DELETE FROM student_notes WHERE id = ?`).run(id);
}

export function createSupportPlan(
  db: ClassPilotDatabase,
  input: CreateSupportPlanInput,
): string {
  const id = `support-${crypto.randomUUID()}`;
  const timestamp = now();

  db.prepare(
    `INSERT INTO support_plans (id, student_id, plan_type, title, details, strategies, start_date, review_date, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.studentId,
    input.planType,
    input.title,
    encryptField(input.details ?? ""),
    encryptField(input.strategies ?? ""),
    input.startDate ?? "",
    input.reviewDate ?? "",
    input.status ?? "active",
    timestamp,
    timestamp,
  );

  return id;
}

export function deleteSupportPlan(db: ClassPilotDatabase, id: string) {
  db.prepare(`DELETE FROM support_plans WHERE id = ?`).run(id);
}

export function createReminder(
  db: ClassPilotDatabase,
  input: CreateReminderInput,
): string {
  const id = `reminder-${crypto.randomUUID()}`;

  db.prepare(
    `INSERT INTO reminders (id, student_id, due_date, category, title, details, status, source_note_id, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, '')`,
  ).run(
    id,
    input.studentId ?? null,
    input.dueDate,
    input.category ?? "follow_up",
    input.title,
    input.details ?? "",
    input.sourceNoteId ?? null,
    now(),
  );

  return id;
}

export function setReminderStatus(
  db: ClassPilotDatabase,
  id: string,
  status: ReminderStatus,
) {
  const completedAt = status === "done" ? now() : "";
  db.prepare(
    `UPDATE reminders SET status = ?, completed_at = ? WHERE id = ?`,
  ).run(status, completedAt, id);
}

export function deleteReminder(db: ClassPilotDatabase, id: string) {
  db.prepare(`DELETE FROM reminders WHERE id = ?`).run(id);
}

export function isRosterSeeded(db: ClassPilotDatabase): boolean {
  const row = db.prepare(`SELECT 1 FROM students LIMIT 1`).get() as
    | { 1: number }
    | undefined;

  return row !== undefined;
}

function mapStudent(row: StudentRow): Student {
  return {
    id: row.id,
    schoolYearId: row.school_year_id,
    firstName: row.first_name,
    lastName: row.last_name,
    preferredName: row.preferred_name,
    pronouns: row.pronouns,
    birthdate: decryptField(row.birthdate),
    studentNumber: decryptField(row.student_number),
    strengths: decryptField(row.strengths),
    interests: row.interests,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContact(row: StudentContactRow): StudentContact {
  return {
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    relationship: row.relationship,
    email: decryptField(row.email),
    phone: decryptField(row.phone),
    isPrimary: row.is_primary === 1,
    isEmergency: row.is_emergency === 1,
    notes: decryptField(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNote(row: StudentNoteRow): StudentNote {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    category: row.category,
    subject: row.subject,
    body: decryptField(row.body),
    followUpStatus: row.follow_up_status,
    unitId: row.unit_id ?? undefined,
    lessonId: row.lesson_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSupportPlan(row: SupportPlanRow): SupportPlan {
  return {
    id: row.id,
    studentId: row.student_id,
    planType: row.plan_type,
    title: row.title,
    details: decryptField(row.details),
    strategies: decryptField(row.strategies),
    startDate: row.start_date,
    reviewDate: row.review_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    studentId: row.student_id ?? undefined,
    dueDate: row.due_date,
    category: row.category,
    title: row.title,
    details: row.details,
    status: row.status,
    sourceNoteId: row.source_note_id ?? undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}
