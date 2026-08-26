import { randomUUID } from "node:crypto";
import type { RosterField } from "@/src/features/students/types";
import type { ClassPilotDatabase } from "./sqlite";

type RosterFieldRow = {
  id: string;
  school_year_id: string;
  label: string;
  position: number;
  created_at: string;
};

function notFound(kind: string, id: string): Error {
  return new Error(`${kind} not found: ${id}`);
}

function now(): string {
  return new Date().toISOString();
}

function schoolYearOwnedByUser(
  db: ClassPilotDatabase,
  schoolYearId: string,
  userId: string,
): boolean {
  return !!db
    .prepare("SELECT 1 FROM school_years WHERE id = ? AND user_id = ?")
    .get(schoolYearId, userId);
}

function fieldOwnedByUser(db: ClassPilotDatabase, fieldId: string, userId: string): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM roster_fields
       JOIN school_years ON school_years.id = roster_fields.school_year_id
       WHERE roster_fields.id = ? AND school_years.user_id = ?`,
    )
    .get(fieldId, userId);
}

function studentOwnedByUser(db: ClassPilotDatabase, studentId: string, userId: string): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM students
       JOIN school_years ON school_years.id = students.school_year_id
       WHERE students.id = ? AND school_years.user_id = ?`,
    )
    .get(studentId, userId);
}

function mapField(row: RosterFieldRow): RosterField {
  return {
    id: row.id,
    schoolYearId: row.school_year_id,
    label: row.label,
    position: row.position,
    createdAt: row.created_at,
  };
}

export function listRosterFields(
  db: ClassPilotDatabase,
  userId: string,
  schoolYearId: string,
): RosterField[] {
  if (!schoolYearOwnedByUser(db, schoolYearId, userId)) {
    return [];
  }

  const rows = db
    .prepare(
      `SELECT * FROM roster_fields WHERE school_year_id = ? ORDER BY position, created_at`,
    )
    .all(schoolYearId) as RosterFieldRow[];

  return rows.map(mapField);
}

export function createRosterField(
  db: ClassPilotDatabase,
  userId: string,
  input: { schoolYearId: string; label: string },
): string {
  if (!schoolYearOwnedByUser(db, input.schoolYearId, userId)) {
    throw notFound("School year", input.schoolYearId);
  }

  const label = input.label.trim();

  if (!label) {
    throw new Error("Field description can't be empty.");
  }

  const position = (
    db
      .prepare(
        `SELECT COALESCE(MAX(position), 0) + 1 AS next FROM roster_fields WHERE school_year_id = ?`,
      )
      .get(input.schoolYearId) as { next: number }
  ).next;

  const id = `field-${randomUUID()}`;

  db.prepare(
    `INSERT INTO roster_fields (id, school_year_id, label, position, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, input.schoolYearId, label, position, now());

  return id;
}

export function deleteRosterField(db: ClassPilotDatabase, userId: string, id: string): void {
  if (!fieldOwnedByUser(db, id, userId)) {
    throw notFound("Roster field", id);
  }

  db.prepare("DELETE FROM roster_fields WHERE id = ?").run(id);
}

/** Every field value for this school year's roster, keyed
 * `${studentId}:${fieldId}` -> value. Missing keys mean "blank". */
export function listRosterFieldValues(
  db: ClassPilotDatabase,
  userId: string,
  schoolYearId: string,
): Record<string, string> {
  if (!schoolYearOwnedByUser(db, schoolYearId, userId)) {
    return {};
  }

  const rows = db
    .prepare(
      `SELECT roster_field_values.field_id AS field_id,
              roster_field_values.student_id AS student_id,
              roster_field_values.value AS value
       FROM roster_field_values
       JOIN roster_fields ON roster_fields.id = roster_field_values.field_id
       WHERE roster_fields.school_year_id = ?`,
    )
    .all(schoolYearId) as Array<{ field_id: string; student_id: string; value: string }>;

  return Object.fromEntries(rows.map((row) => [`${row.student_id}:${row.field_id}`, row.value]));
}

export type SaveRosterFieldValueInput = {
  fieldId: string;
  studentId: string;
  value: string;
};

/** Creates, updates, or (on an empty value) deletes the cell for this
 * student/field pair -- same "blank means no row" pattern as day notes. */
export function saveRosterFieldValue(
  db: ClassPilotDatabase,
  userId: string,
  input: SaveRosterFieldValueInput,
): void {
  if (!fieldOwnedByUser(db, input.fieldId, userId)) {
    throw notFound("Roster field", input.fieldId);
  }

  if (!studentOwnedByUser(db, input.studentId, userId)) {
    throw notFound("Student", input.studentId);
  }

  const value = input.value.trim();

  if (!value) {
    db.prepare("DELETE FROM roster_field_values WHERE field_id = ? AND student_id = ?").run(
      input.fieldId,
      input.studentId,
    );
    return;
  }

  const timestamp = now();

  db.prepare(
    `INSERT INTO roster_field_values (id, field_id, student_id, value, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(field_id, student_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(`fval-${randomUUID()}`, input.fieldId, input.studentId, value, timestamp);
}
