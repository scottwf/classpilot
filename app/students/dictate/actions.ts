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

  const id = createRecording(getClassPilotDatabase(), userId, {
    schoolYearId: plannerData.schoolYear.id,
    storedFilename: storedName,
    originalFilename: file.name,
    recordedDate,
  });

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

  const config = getTranscriptionConfig();

  if (!config) {
    redirect(`/students/dictate/${id}?error=not_configured`);
  }

  updateRecordingStatus(db, userId, id, "transcribing");

  try {
    const audio = await readDictationFile(recording.storedFilename);
    const transcript = await requestTranscription(config, audio, recording.originalFilename);
    saveTranscript(db, userId, id, transcript);
  } catch {
    updateRecordingStatus(db, userId, id, "failed");
    redirect(`/students/dictate/${id}?error=transcription_failed`);
  }

  redirect(`/students/dictate/${id}`);
}
