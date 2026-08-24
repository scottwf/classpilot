"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import {
  createRecording,
  deleteRecording,
  getRecordingById,
  saveTranscript,
  updateRecordingStatus,
} from "@/src/lib/db/dictation-repository";
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
import type { ClassPilotDatabase } from "@/src/lib/db/sqlite";

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
  const id = createRecording(db, userId, {
    schoolYearId: plannerData.schoolYear.id,
    storedFilename: storedName,
    originalFilename: file.name,
    recordedDate,
  });

  // Best-effort, inline -- transcription usually finishes in well under the
  // request timeout for a typical recording; if the service is slow or
  // down, this just leaves the recording "pending"/"failed" for the manual
  // Transcribe button on the detail page rather than blocking the upload.
  await attemptTranscription(db, userId, id, storedName, file.name);

  redirect(`/students/dictate/${id}`);
}

export async function deleteRecordingAction(formData: FormData) {
  const userId = await requireAuth();
  const db = getClassPilotDatabase();
  const id = String(formData.get("recordingId") ?? "");
  const recording = getRecordingById(db, userId, id);

  deleteRecording(db, userId, id);

  if (recording) {
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

  redirect(`/students/dictate/${id}`);
}
