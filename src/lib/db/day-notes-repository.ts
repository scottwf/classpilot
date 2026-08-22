import { randomUUID } from "node:crypto";
import type { ClassPilotDatabase } from "./sqlite";

type DayNoteRow = {
  date: string;
  body: string;
};

function notFound(kind: string, id: string): Error {
  // Same message shape whether the row is missing or just not owned by
  // this user -- see issue #21 security checklist.
  return new Error(`${kind} not found: ${id}`);
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

function now(): string {
  return new Date().toISOString();
}

/** Notes for every date in `dates` that has one, keyed by date. Missing dates have no entry. */
export function listDayNotes(
  db: ClassPilotDatabase,
  userId: string,
  schoolYearId: string,
  dates: string[],
): Record<string, string> {
  if (dates.length === 0 || !schoolYearOwnedByUser(db, schoolYearId, userId)) {
    return {};
  }

  const placeholders = dates.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT date, body FROM day_notes WHERE school_year_id = ? AND date IN (${placeholders})`,
    )
    .all(schoolYearId, ...dates) as DayNoteRow[];

  return Object.fromEntries(rows.map((row) => [row.date, row.body]));
}

export type SaveDayNoteInput = {
  body: string;
  date: string;
  schoolYearId: string;
};

/** Creates, updates, or (on an empty body) deletes the note for this date. */
export function saveDayNote(
  db: ClassPilotDatabase,
  userId: string,
  input: SaveDayNoteInput,
): void {
  if (!schoolYearOwnedByUser(db, input.schoolYearId, userId)) {
    throw notFound("School year", input.schoolYearId);
  }

  const body = input.body.trim();

  if (!body) {
    db.prepare("DELETE FROM day_notes WHERE school_year_id = ? AND date = ?").run(
      input.schoolYearId,
      input.date,
    );
    return;
  }

  const timestamp = now();

  db.prepare(
    `INSERT INTO day_notes (id, school_year_id, date, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(school_year_id, date)
     DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
  ).run(`day-note-${randomUUID()}`, input.schoolYearId, input.date, body, timestamp, timestamp);
}
