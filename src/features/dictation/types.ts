export type DictationStatus = "pending" | "transcribing" | "transcribed" | "failed";

export type DictationRecording = {
  id: string;
  schoolYearId: string;
  storedFilename: string;
  originalFilename: string;
  recordedDate: string;
  transcript: string;
  status: DictationStatus;
  createdAt: string;
  updatedAt: string;
};
