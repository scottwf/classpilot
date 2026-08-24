import type { NoteCategory } from "@/src/features/students/types";

export type DictationStatus = "pending" | "transcribing" | "transcribed" | "failed";

export type DictationDraftNote = {
  draftId: string;
  /** null until resolved against the roster (exact match) or the teacher
   * manually assigns one in the review UI -- never guessed silently. */
  studentId: string | null;
  /** The name as mentioned/heard, kept for display even after studentId
   * resolves, and as the only clue when it doesn't. */
  studentNameGuess: string;
  date: string;
  category: NoteCategory;
  subject: string;
  body: string;
};

export type DictationRecording = {
  id: string;
  schoolYearId: string;
  storedFilename: string;
  originalFilename: string;
  recordedDate: string;
  transcript: string;
  status: DictationStatus;
  drafts: DictationDraftNote[];
  createdAt: string;
  updatedAt: string;
};
