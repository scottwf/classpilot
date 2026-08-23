import { randomUUID } from "node:crypto";
import type { DictationRecording, DictationStatus } from "@/src/features/dictation/types";
import type { ClassPilotDatabase } from "./sqlite";

type DictationRecordingRow = {
  id: string;
  school_year_id: string;
  stored_filename: string;
  original_filename: string;
  recorded_date: string;
  transcript: string;
  status: DictationStatus;
  created_at: string;
  updated_at: string;
};

function mapRecording(row: DictationRecordingRow): DictationRecording {
  return {
    id: row.id,
    schoolYearId: row.school_year_id,
    storedFilename: row.stored_filename,
    originalFilename: row.original_filename,
    recordedDate: row.recorded_date,
    transcript: row.transcript,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

function recordingOwnedByUser(db: ClassPilotDatabase, id: string, userId: string): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM dictation_recordings
       JOIN school_years ON school_years.id = dictation_recordings.school_year_id
       WHERE dictation_recordings.id = ? AND school_years.user_id = ?`,
    )
    .get(id, userId);
}

function now(): string {
  return new Date().toISOString();
}

export type CreateRecordingInput = {
  schoolYearId: string;
  storedFilename: string;
  originalFilename: string;
  recordedDate: string;
};

export function createRecording(
  db: ClassPilotDatabase,
  userId: string,
  input: CreateRecordingInput,
): string {
  if (!schoolYearOwnedByUser(db, input.schoolYearId, userId)) {
    throw notFound("School year", input.schoolYearId);
  }

  const id = `dictation-${randomUUID()}`;
  const timestamp = now();

  db.prepare(
    `INSERT INTO dictation_recordings
       (id, school_year_id, stored_filename, original_filename, recorded_date, transcript, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, '', 'pending', ?, ?)`,
  ).run(
    id,
    input.schoolYearId,
    input.storedFilename,
    input.originalFilename,
    input.recordedDate,
    timestamp,
    timestamp,
  );

  return id;
}

export function listRecordings(
  db: ClassPilotDatabase,
  userId: string,
  schoolYearId: string,
): DictationRecording[] {
  if (!schoolYearOwnedByUser(db, schoolYearId, userId)) {
    return [];
  }

  const rows = db
    .prepare(
      `SELECT * FROM dictation_recordings WHERE school_year_id = ? ORDER BY created_at DESC`,
    )
    .all(schoolYearId) as DictationRecordingRow[];

  return rows.map(mapRecording);
}

export function getRecordingById(
  db: ClassPilotDatabase,
  userId: string,
  id: string,
): DictationRecording | undefined {
  if (!recordingOwnedByUser(db, id, userId)) {
    return undefined;
  }

  const row = db.prepare(`SELECT * FROM dictation_recordings WHERE id = ?`).get(id) as
    | DictationRecordingRow
    | undefined;

  return row ? mapRecording(row) : undefined;
}

export function updateRecordingStatus(
  db: ClassPilotDatabase,
  userId: string,
  id: string,
  status: DictationStatus,
): void {
  if (!recordingOwnedByUser(db, id, userId)) {
    throw notFound("Recording", id);
  }

  db.prepare(`UPDATE dictation_recordings SET status = ?, updated_at = ? WHERE id = ?`).run(
    status,
    now(),
    id,
  );
}

export function saveTranscript(
  db: ClassPilotDatabase,
  userId: string,
  id: string,
  transcript: string,
): void {
  if (!recordingOwnedByUser(db, id, userId)) {
    throw notFound("Recording", id);
  }

  db.prepare(
    `UPDATE dictation_recordings SET transcript = ?, status = 'transcribed', updated_at = ? WHERE id = ?`,
  ).run(transcript, now(), id);
}

export function deleteRecording(db: ClassPilotDatabase, userId: string, id: string): void {
  if (!recordingOwnedByUser(db, id, userId)) {
    throw notFound("Recording", id);
  }

  db.prepare(`DELETE FROM dictation_recordings WHERE id = ?`).run(id);
}
