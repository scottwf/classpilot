import type { DictationRecording } from "./types";

export type DictationSort = "newest" | "oldest" | "duration" | "words";

export function transcriptWordCount(transcript: string): number {
  const normalized = transcript.trim();
  return normalized ? normalized.split(/\s+/).length : 0;
}

export function transcriptPreview(transcript: string, limit = 140): string {
  const normalized = transcript.replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit).trimEnd()}…` : normalized;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "Duration unavailable";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function sortRecordings(recordings: DictationRecording[], sort: DictationSort): DictationRecording[] {
  return [...recordings].sort((left, right) => {
    if (sort === "duration") return (right.durationSeconds ?? -1) - (left.durationSeconds ?? -1);
    if (sort === "words") return transcriptWordCount(right.transcript) - transcriptWordCount(left.transcript);
    const direction = sort === "newest" ? -1 : 1;
    return direction * left.createdAt.localeCompare(right.createdAt);
  });
}
