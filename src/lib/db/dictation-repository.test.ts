// @vitest-environment node
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { plannerData } from "@/src/features/planner/seed-data";
import { seedPlannerData } from "./planner-repository";
import { createClassPilotDatabase } from "./sqlite";
import { createUser } from "./users-repository";
import {
  createRecording,
  deleteRecording,
  getRecordingById,
  listRecordings,
  saveTranscript,
  updateRecordingStatus,
} from "./dictation-repository";

function freshDb() {
  const path = join(mkdtempSync(join(tmpdir(), "classpilot-dictation-")), "test.sqlite");
  return createClassPilotDatabase(path);
}

function setup() {
  const db = freshDb();
  const userId = createUser(db, { username: "teacher", password: "x" }).id;
  seedPlannerData(db, userId, plannerData);
  return { db, userId };
}

describe("dictation repository", () => {
  it("creates a recording in pending status with an empty transcript", () => {
    const { db, userId } = setup();

    const id = createRecording(db, userId, {
      schoolYearId: "current",
      storedFilename: "abc123.m4a",
      originalFilename: "Voice Memo 4.m4a",
      recordedDate: "2026-09-08",
    });

    const recording = getRecordingById(db, userId, id);
    expect(recording).toMatchObject({
      schoolYearId: "current",
      storedFilename: "abc123.m4a",
      originalFilename: "Voice Memo 4.m4a",
      recordedDate: "2026-09-08",
      transcript: "",
      status: "pending",
    });
  });

  it("lists recordings newest first", () => {
    const { db, userId } = setup();

    const first = createRecording(db, userId, {
      schoolYearId: "current",
      storedFilename: "a.m4a",
      originalFilename: "a.m4a",
      recordedDate: "2026-09-08",
    });
    const second = createRecording(db, userId, {
      schoolYearId: "current",
      storedFilename: "b.m4a",
      originalFilename: "b.m4a",
      recordedDate: "2026-09-09",
    });

    const ids = listRecordings(db, userId, "current").map((recording) => recording.id);
    expect(ids).toEqual([second, first]);
  });

  it("updates status through the transcription lifecycle", () => {
    const { db, userId } = setup();
    const id = createRecording(db, userId, {
      schoolYearId: "current",
      storedFilename: "a.m4a",
      originalFilename: "a.m4a",
      recordedDate: "2026-09-08",
    });

    updateRecordingStatus(db, userId, id, "transcribing");
    expect(getRecordingById(db, userId, id)?.status).toBe("transcribing");

    saveTranscript(db, userId, id, "Talked to Jayden about his group project.");
    const recording = getRecordingById(db, userId, id);
    expect(recording?.status).toBe("transcribed");
    expect(recording?.transcript).toBe("Talked to Jayden about his group project.");
  });

  it("marks a recording failed", () => {
    const { db, userId } = setup();
    const id = createRecording(db, userId, {
      schoolYearId: "current",
      storedFilename: "a.m4a",
      originalFilename: "a.m4a",
      recordedDate: "2026-09-08",
    });

    updateRecordingStatus(db, userId, id, "failed");
    expect(getRecordingById(db, userId, id)?.status).toBe("failed");
  });

  it("deletes a recording", () => {
    const { db, userId } = setup();
    const id = createRecording(db, userId, {
      schoolYearId: "current",
      storedFilename: "a.m4a",
      originalFilename: "a.m4a",
      recordedDate: "2026-09-08",
    });

    deleteRecording(db, userId, id);
    expect(getRecordingById(db, userId, id)).toBeUndefined();
  });

  it("never exposes or mutates another user's recording", () => {
    const { db, userId } = setup();
    const otherUserId = createUser(db, { username: "other", password: "x" }).id;

    const id = createRecording(db, userId, {
      schoolYearId: "current",
      storedFilename: "a.m4a",
      originalFilename: "a.m4a",
      recordedDate: "2026-09-08",
    });

    expect(getRecordingById(db, otherUserId, id)).toBeUndefined();
    expect(listRecordings(db, otherUserId, "current")).toEqual([]);
    expect(() => saveTranscript(db, otherUserId, id, "hijacked")).toThrow("not found");
    expect(() => updateRecordingStatus(db, otherUserId, id, "failed")).toThrow("not found");
    expect(() => deleteRecording(db, otherUserId, id)).toThrow("not found");
  });

  it("throws creating a recording under a school year the caller doesn't own", () => {
    const { db } = setup();
    const otherUserId = createUser(db, { username: "other", password: "x" }).id;

    expect(() =>
      createRecording(db, otherUserId, {
        schoolYearId: "current",
        storedFilename: "a.m4a",
        originalFilename: "a.m4a",
        recordedDate: "2026-09-08",
      }),
    ).toThrow("not found");
  });
});
