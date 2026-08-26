// @vitest-environment node
//
// Vitest's default environment (jsdom, set globally in vitest.config.ts) is a
// browser-like sandbox that can't bundle the Node-only `node:sqlite` module
// this file (transitively) imports. Force the real Node environment here.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { plannerData } from "@/src/features/planner/seed-data";
import { seedPlannerData } from "./planner-repository";
import {
  createRosterField,
  deleteRosterField,
  listRosterFields,
  listRosterFieldValues,
  saveRosterFieldValue,
} from "./roster-fields-repository";
import { createStudent } from "./students-repository";
import { createClassPilotDatabase } from "./sqlite";
import { createUser } from "./users-repository";

function freshDatabase() {
  const db = createClassPilotDatabase(
    join(mkdtempSync(join(tmpdir(), "classpilot-roster-fields-")), "test.sqlite"),
  );
  const userId = createUser(db, { username: "teacher", password: "x" }).id;
  // students and roster_fields reference school_years('current'); seed planner first.
  seedPlannerData(db, userId, plannerData);
  return { db, userId };
}

describe("roster fields repository", () => {
  it("creates fields in order and lists them by position", () => {
    const { db, userId } = freshDatabase();

    createRosterField(db, userId, { schoolYearId: "current", label: "Math textbook" });
    createRosterField(db, userId, { schoolYearId: "current", label: "Chromebook #" });

    const fields = listRosterFields(db, userId, "current");

    expect(fields.map((field) => field.label)).toEqual(["Math textbook", "Chromebook #"]);
    expect(fields.map((field) => field.position)).toEqual([1, 2]);
  });

  it("rejects a blank field label", () => {
    const { db, userId } = freshDatabase();

    expect(() =>
      createRosterField(db, userId, { schoolYearId: "current", label: "   " }),
    ).toThrow("Field description can't be empty.");
  });

  it("saves, updates, and clears a cell value", () => {
    const { db, userId } = freshDatabase();

    const fieldId = createRosterField(db, userId, {
      schoolYearId: "current",
      label: "Math textbook",
    });
    const studentId = createStudent(db, userId, {
      schoolYearId: "current",
      firstName: "Avery",
      lastName: "Nguyen",
    });

    saveRosterFieldValue(db, userId, { fieldId, studentId, value: "1043" });
    expect(listRosterFieldValues(db, userId, "current")).toEqual({
      [`${studentId}:${fieldId}`]: "1043",
    });

    saveRosterFieldValue(db, userId, { fieldId, studentId, value: "1099" });
    expect(listRosterFieldValues(db, userId, "current")).toEqual({
      [`${studentId}:${fieldId}`]: "1099",
    });

    saveRosterFieldValue(db, userId, { fieldId, studentId, value: "  " });
    expect(listRosterFieldValues(db, userId, "current")).toEqual({});
  });

  it("deletes a field and cascades its values", () => {
    const { db, userId } = freshDatabase();

    const fieldId = createRosterField(db, userId, {
      schoolYearId: "current",
      label: "Math textbook",
    });
    const studentId = createStudent(db, userId, {
      schoolYearId: "current",
      firstName: "Avery",
      lastName: "Nguyen",
    });
    saveRosterFieldValue(db, userId, { fieldId, studentId, value: "1043" });

    deleteRosterField(db, userId, fieldId);

    expect(listRosterFields(db, userId, "current")).toHaveLength(0);
    expect(listRosterFieldValues(db, userId, "current")).toEqual({});
  });

  it("rejects saving a value for a field owned by another user (IDOR check)", () => {
    const { db, userId: ownerId } = freshDatabase();
    const otherUserId = createUser(db, { username: "other", password: "x" }).id;

    const fieldId = createRosterField(db, ownerId, {
      schoolYearId: "current",
      label: "Math textbook",
    });
    const studentId = createStudent(db, ownerId, {
      schoolYearId: "current",
      firstName: "Avery",
      lastName: "Nguyen",
    });

    expect(() =>
      saveRosterFieldValue(db, otherUserId, { fieldId, studentId, value: "1043" }),
    ).toThrow("Roster field not found");
  });
});
