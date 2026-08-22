// @vitest-environment node
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { plannerData } from "@/src/features/planner/seed-data";
import { seedPlannerData } from "./planner-repository";
import { createClassPilotDatabase } from "./sqlite";
import { createUser } from "./users-repository";
import { listDayNotes, saveDayNote } from "./day-notes-repository";

function freshDb() {
  const path = join(mkdtempSync(join(tmpdir(), "classpilot-day-notes-")), "test.sqlite");
  return createClassPilotDatabase(path);
}

describe("day notes repository", () => {
  it("creates and reads back a note for a date", () => {
    const db = freshDb();
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    saveDayNote(db, userId, {
      schoolYearId: "current",
      date: "2026-09-08",
      body: "PD day debrief with Marie at lunch.",
    });

    expect(listDayNotes(db, userId, "current", ["2026-09-08"])).toEqual({
      "2026-09-08": "PD day debrief with Marie at lunch.",
    });
  });

  it("omits dates with no note", () => {
    const db = freshDb();
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    saveDayNote(db, userId, { schoolYearId: "current", date: "2026-09-08", body: "Note" });

    expect(listDayNotes(db, userId, "current", ["2026-09-08", "2026-09-09"])).toEqual({
      "2026-09-08": "Note",
    });
  });

  it("updates an existing date's note instead of creating a second row", () => {
    const db = freshDb();
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    saveDayNote(db, userId, { schoolYearId: "current", date: "2026-09-08", body: "First" });
    saveDayNote(db, userId, { schoolYearId: "current", date: "2026-09-08", body: "Second" });

    expect(listDayNotes(db, userId, "current", ["2026-09-08"])).toEqual({
      "2026-09-08": "Second",
    });
  });

  it("deletes the note when saved with an empty body", () => {
    const db = freshDb();
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    saveDayNote(db, userId, { schoolYearId: "current", date: "2026-09-08", body: "Note" });
    saveDayNote(db, userId, { schoolYearId: "current", date: "2026-09-08", body: "   " });

    expect(listDayNotes(db, userId, "current", ["2026-09-08"])).toEqual({});
  });

  it("throws when the school year doesn't belong to the caller", () => {
    const db = freshDb();
    createUser(db, { username: "teacher", password: "x" });
    const otherUserId = createUser(db, { username: "other", password: "x" }).id;

    expect(() =>
      saveDayNote(db, otherUserId, { schoolYearId: "current", date: "2026-09-08", body: "Note" }),
    ).toThrow("not found");
  });

  it("returns nothing for a school year the caller doesn't own", () => {
    const db = freshDb();
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);
    const otherUserId = createUser(db, { username: "other", password: "x" }).id;

    saveDayNote(db, userId, { schoolYearId: "current", date: "2026-09-08", body: "Note" });

    expect(listDayNotes(db, otherUserId, "current", ["2026-09-08"])).toEqual({});
  });
});
