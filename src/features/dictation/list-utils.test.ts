import { describe, expect, it } from "vitest";
import { formatDuration, sortRecordings, transcriptPreview, transcriptWordCount } from "./list-utils";
import type { DictationRecording } from "./types";

const recording = (id: string, transcript: string, durationSeconds: number | null, createdAt: string): DictationRecording => ({
  id,
  schoolYearId: "year",
  storedFilename: "",
  originalFilename: `${id}.m4a`,
  recordedDate: "2026-09-08",
  durationSeconds,
  transcript,
  status: "transcribed",
  drafts: [],
  studentIds: [],
  archivedAt: null,
  createdAt,
  updatedAt: createdAt,
});

describe("dictation list utilities", () => {
  it("normalizes previews and counts whitespace-delimited words", () => {
    expect(transcriptWordCount("  one\n two   three ")).toBe(3);
    expect(transcriptPreview("one\n two   three")).toBe("one two three");
    expect(transcriptPreview("x".repeat(145))).toHaveLength(141);
  });

  it("formats known and unavailable durations", () => {
    expect(formatDuration(91)).toBe("1:31");
    expect(formatDuration(null)).toBe("Duration unavailable");
  });

  it("sorts by duration and word count with unknown duration last", () => {
    const recordings = [
      recording("short", "one", 30, "2026-09-08T00:00:00.000Z"),
      recording("unknown", "one two three", null, "2026-09-09T00:00:00.000Z"),
      recording("long", "one two", 90, "2026-09-07T00:00:00.000Z"),
    ];
    expect(sortRecordings(recordings, "duration").map((item) => item.id)).toEqual(["long", "short", "unknown"]);
    expect(sortRecordings(recordings, "words").map((item) => item.id)).toEqual(["unknown", "long", "short"]);
  });
});
