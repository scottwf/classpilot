"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import {
  createRecording,
  createTextRecording,
  deleteRecording,
  getRecordingById,
  removeDraft,
  saveDrafts,
  saveTranscript,
  updateRecordingStatus,
} from "@/src/lib/db/dictation-repository";
import { createNote, listRoster } from "@/src/lib/db/students-repository";
import {
  deleteDictationFile,
  generateStoredDictationName,
  isAllowedDictationFile,
  maxDictationSizeBytes,
  readDictationFile,
  saveDictationFile,
} from "@/src/lib/storage/dictation-storage";
import { getTranscriptionConfig } from "@/src/lib/transcription/config";
import { requestTranscription } from "@/src/lib/transcription/client";
import { generateDictationDrafts } from "@/src/lib/ai/dictation-draft";
import { AiError } from "@/src/lib/ai/types";
import type { ClassPilotDatabase } from "@/src/lib/db/sqlite";
import type { NoteCategory } from "@/src/features/students/types";

/**
 * Transcribes a recording in place if the service is configured; a no-op
 * (stays "pending") if it isn't, so callers don't need to branch on
 * configuration themselves. Never throws -- a failed attempt just leaves
 * the recording "failed" for a manual retry via transcribeRecordingAction,
 * since this also runs inline during upload and shouldn't break that flow.
 */
async function attemptTranscription(
  db: ClassPilotDatabase,
  userId: string,
  id: string,
  storedFilename: string,
  originalFilename: string,
): Promise<void> {
  const config = getTranscriptionConfig();

  if (!config) {
    return;
  }

  updateRecordingStatus(db, userId, id, "transcribing");

  try {
    const audio = await readDictationFile(storedFilename);
    const transcript = await requestTranscription(config, audio, originalFilename);
    saveTranscript(db, userId, id, transcript);
  } catch {
    updateRecordingStatus(db, userId, id, "failed");
  }
}

/**
 * Generates draft notes in place, best-effort -- never throws. Used to
 * auto-chain draft generation right after a transcript becomes available
 * (upload, manual re-transcribe, or a pasted/dictated text entry) so a
 * teacher normally never has to click anything between "gave it a
 * recording/text" and "here are the drafts to review." A failure (no local
 * model configured, the model unreachable, ...) just leaves drafts empty --
 * the "Generate draft notes" button on the detail page remains as a manual
 * fallback/retry, which still surfaces the real error.
 */
async function attemptDraftGeneration(
  db: ClassPilotDatabase,
  userId: string,
  id: string,
  transcript: string,
  schoolYearId: string,
  recordedDate: string,
): Promise<void> {
  if (!transcript) {
    return;
  }

  const roster = listRoster(db, userId, schoolYearId);

  try {
    const drafts = await generateDictationDrafts(transcript, roster, recordedDate);
    saveDrafts(db, userId, id, drafts);
  } catch {
    // Best-effort -- see doc comment above.
  }
}

export async function uploadRecordingAction(formData: FormData) {
  const userId = await requireAuth();
  const plannerData = getClassPilotPlannerData(userId);

  const file = formData.get("recordingFile");
  const recordedDate =
    String(formData.get("recordedDate") ?? "").trim() || new Date().toISOString().slice(0, 10);

  if (!(file instanceof File) || file.size === 0) {
    redirect("/students/dictate?error=file");
  }

  if (!isAllowedDictationFile(file.name)) {
    redirect("/students/dictate?error=filetype");
  }

  if (file.size > maxDictationSizeBytes) {
    redirect("/students/dictate?error=filesize");
  }

  const storedName = generateStoredDictationName(file.name);
  const contents = Buffer.from(await file.arrayBuffer());
  await saveDictationFile(storedName, contents);

  const db = getClassPilotDatabase();
  const schoolYearId = plannerData.schoolYear.id;
  const id = createRecording(db, userId, {
    schoolYearId,
    storedFilename: storedName,
    originalFilename: file.name,
    recordedDate,
  });

  // Best-effort, inline -- transcription usually finishes in well under the
  // request timeout for a typical recording; if the service is slow or
  // down, this just leaves the recording "pending"/"failed" for the manual
  // Transcribe button on the detail page rather than blocking the upload.
  await attemptTranscription(db, userId, id, storedName, file.name);

  const transcribed = getRecordingById(db, userId, id);

  if (transcribed?.status === "transcribed") {
    await attemptDraftGeneration(db, userId, id, transcribed.transcript, schoolYearId, recordedDate);
  }

  redirect(`/students/dictate/${id}`);
}

export async function submitTextDictationAction(formData: FormData) {
  const userId = await requireAuth();
  const plannerData = getClassPilotPlannerData(userId);

  const transcript = String(formData.get("transcript") ?? "").trim();
  const recordedDate =
    String(formData.get("recordedDate") ?? "").trim() || new Date().toISOString().slice(0, 10);

  if (!transcript) {
    redirect("/students/dictate?error=empty_text");
  }

  const db = getClassPilotDatabase();
  const schoolYearId = plannerData.schoolYear.id;
  const id = createTextRecording(db, userId, { schoolYearId, transcript, recordedDate });

  await attemptDraftGeneration(db, userId, id, transcript, schoolYearId, recordedDate);

  redirect(`/students/dictate/${id}`);
}

export async function deleteRecordingAction(formData: FormData) {
  const userId = await requireAuth();
  const db = getClassPilotDatabase();
  const id = String(formData.get("recordingId") ?? "");
  const recording = getRecordingById(db, userId, id);

  deleteRecording(db, userId, id);

  // Pasted/dictated text entries have no audio file (storedFilename "").
  if (recording?.storedFilename) {
    await deleteDictationFile(recording.storedFilename);
  }

  redirect("/students/dictate");
}

export async function transcribeRecordingAction(formData: FormData) {
  const userId = await requireAuth();
  const db = getClassPilotDatabase();
  const id = String(formData.get("recordingId") ?? "");
  const recording = getRecordingById(db, userId, id);

  if (!recording) {
    redirect("/students/dictate");
  }

  if (!getTranscriptionConfig()) {
    redirect(`/students/dictate/${id}?error=not_configured`);
  }

  await attemptTranscription(db, userId, id, recording.storedFilename, recording.originalFilename);

  const updated = getRecordingById(db, userId, id);

  if (updated?.status === "failed") {
    redirect(`/students/dictate/${id}?error=transcription_failed`);
  }

  if (updated?.status === "transcribed") {
    await attemptDraftGeneration(
      db,
      userId,
      id,
      updated.transcript,
      updated.schoolYearId,
      updated.recordedDate,
    );
  }

  redirect(`/students/dictate/${id}`);
}

export async function generateDraftsAction(formData: FormData) {
  const userId = await requireAuth();
  const db = getClassPilotDatabase();
  const id = String(formData.get("recordingId") ?? "");
  const recording = getRecordingById(db, userId, id);

  if (!recording) {
    redirect("/students/dictate");
  }

  if (!recording.transcript) {
    redirect(`/students/dictate/${id}?error=no_transcript`);
  }

  const roster = listRoster(db, userId, recording.schoolYearId);

  try {
    const drafts = await generateDictationDrafts(recording.transcript, roster, recording.recordedDate);
    saveDrafts(db, userId, id, drafts);
  } catch (error) {
    const code = error instanceof AiError && error.code === "not_configured"
      ? "local_ai_not_configured"
      : "draft_generation_failed";
    redirect(`/students/dictate/${id}?error=${code}`);
  }

  redirect(`/students/dictate/${id}`);
}

export async function saveDraftNoteAction(formData: FormData) {
  const userId = await requireAuth();
  const db = getClassPilotDatabase();
  const recordingId = String(formData.get("recordingId") ?? "");
  const draftId = String(formData.get("draftId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const date = String(formData.get("date") ?? "");
  const category = String(formData.get("category") ?? "other") as NoteCategory;
  const subject = String(formData.get("subject") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!studentId || !date || !body) {
    redirect(`/students/dictate/${recordingId}?error=incomplete_draft`);
  }

  createNote(db, userId, { body, category, date, studentId, subject });
  removeDraft(db, userId, recordingId, draftId);

  redirect(`/students/dictate/${recordingId}`);
}

export async function dismissDraftAction(formData: FormData) {
  const userId = await requireAuth();
  const db = getClassPilotDatabase();
  const recordingId = String(formData.get("recordingId") ?? "");
  const draftId = String(formData.get("draftId") ?? "");

  removeDraft(db, userId, recordingId, draftId);

  redirect(`/students/dictate/${recordingId}`);
}
