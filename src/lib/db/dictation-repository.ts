import { randomUUID } from "node:crypto";
import type {
  DictationDraftNote,
  DictationRecording,
  DictationStatus,
} from "@/src/features/dictation/types";
import type { ClassPilotDatabase } from "./sqlite";

type DictationRecordingRow = {
  id: string;
  school_year_id: string;
  stored_filename: string;
  original_filename: string;
  recorded_date: string;
  duration_seconds: number | null;
  transcript: string;
  status: DictationStatus;
  drafts_json: string;
  student_ids_json: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function parseDrafts(json: string): DictationDraftNote[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseStudentIds(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((value): value is string => typeof value === "string"))]
      : [];
  } catch {
    return [];
  }
}

function mapRecording(row: DictationRecordingRow): DictationRecording {
  return {
    id: row.id,
    schoolYearId: row.school_year_id,
    storedFilename: row.stored_filename,
    originalFilename: row.original_filename,
    recordedDate: row.recorded_date,
    durationSeconds: row.duration_seconds,
    transcript: row.transcript,
    status: row.status,
    drafts: parseDrafts(row.drafts_json),
    studentIds: parseStudentIds(row.student_ids_json),
    archivedAt: row.archived_at,
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
  durationSeconds?: number | null;
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
       (id, school_year_id, stored_filename, original_filename, recorded_date, duration_seconds, transcript, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '', 'pending', ?, ?)`,
  ).run(
    id,
    input.schoolYearId,
    input.storedFilename,
    input.originalFilename,
    input.recordedDate,
    input.durationSeconds ?? null,
    timestamp,
    timestamp,
  );

  return id;
}

export type CreateTextRecordingInput = {
  schoolYearId: string;
  transcript: string;
  recordedDate: string;
};

/** For pasted or browser-dictated text (issue #36 follow-up) -- there's no
 * audio file, so stored_filename is empty (guard file operations on that
 * before calling readDictationFile/deleteDictationFile) and the row starts
 * straight at "transcribed" since there's nothing to transcribe. */
export function createTextRecording(
  db: ClassPilotDatabase,
  userId: string,
  input: CreateTextRecordingInput,
): string {
  if (!schoolYearOwnedByUser(db, input.schoolYearId, userId)) {
    throw notFound("School year", input.schoolYearId);
  }

  const id = `dictation-${randomUUID()}`;
  const timestamp = now();

  db.prepare(
    `INSERT INTO dictation_recordings
       (id, school_year_id, stored_filename, original_filename, recorded_date, transcript, status, created_at, updated_at)
     VALUES (?, ?, '', 'Pasted/dictated text', ?, ?, 'transcribed', ?, ?)`,
  ).run(id, input.schoolYearId, input.recordedDate, input.transcript, timestamp, timestamp);

  return id;
}

export function listRecordings(
  db: ClassPilotDatabase,
  userId: string,
  schoolYearId: string,
  options: { includeArchived?: boolean } = {},
): DictationRecording[] {
  if (!schoolYearOwnedByUser(db, schoolYearId, userId)) {
    return [];
  }

  const rows = db
    .prepare(
      `SELECT * FROM dictation_recordings
       WHERE school_year_id = ? ${options.includeArchived ? "" : "AND archived_at IS NULL"}
       ORDER BY created_at DESC, rowid DESC`,
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

export function archiveRecordings(
  db: ClassPilotDatabase,
  userId: string,
  ids: string[],
): void {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return;

  const placeholders = uniqueIds.map(() => "?").join(", ");
  db.prepare(
    `UPDATE dictation_recordings
     SET archived_at = ?, updated_at = ?
     WHERE id IN (${placeholders})
       AND school_year_id IN (SELECT id FROM school_years WHERE user_id = ?)`,
  ).run(now(), now(), ...uniqueIds, userId);
}

/** Replaces a recording's whole draft-notes list (issue #36 phase 3-4) --
 * generation replaces [] with the model's proposals; saving or dismissing
 * one draft replaces the list with that entry removed. */
export function saveDrafts(
  db: ClassPilotDatabase,
  userId: string,
  id: string,
  drafts: DictationDraftNote[],
): void {
  if (!recordingOwnedByUser(db, id, userId)) {
    throw notFound("Recording", id);
  }

  db.prepare(`UPDATE dictation_recordings SET drafts_json = ?, updated_at = ? WHERE id = ?`).run(
    JSON.stringify(drafts),
    now(),
    id,
  );

  addStudentTags(db, userId, id, drafts.flatMap((draft) => (draft.studentId ? [draft.studentId] : [])));
}

export function addStudentTags(
  db: ClassPilotDatabase,
  userId: string,
  id: string,
  studentIds: string[],
): void {
  const recording = getRecordingById(db, userId, id);
  if (!recording) throw notFound("Recording", id);

  const merged = [...new Set([...recording.studentIds, ...studentIds.filter(Boolean)])];
  if (merged.length === recording.studentIds.length) return;

  db.prepare(`UPDATE dictation_recordings SET student_ids_json = ?, updated_at = ? WHERE id = ?`).run(
    JSON.stringify(merged),
    now(),
    id,
  );
}

/** Removes one draft (after saving it as a real note, or dismissing it) by
 * draftId, leaving the rest of the list untouched. */
export function removeDraft(
  db: ClassPilotDatabase,
  userId: string,
  id: string,
  draftId: string,
): void {
  const recording = getRecordingById(db, userId, id);

  if (!recording) {
    throw notFound("Recording", id);
  }

  saveDrafts(
    db,
    userId,
    id,
    recording.drafts.filter((draft) => draft.draftId !== draftId),
  );
}
