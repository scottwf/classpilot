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
import { createClass, getClassById, seedPlannerData } from "./planner-repository";
import {
  getScheduleSlots,
  getScheduleSlotsForClass,
  setClassSchedule,
} from "./schedule-repository";
import { createClassPilotDatabase } from "./sqlite";

function temporaryDatabasePath() {
  return join(mkdtempSync(join(tmpdir(), "classpilot-test-")), "test.sqlite");
}

describe("schedule repository", () => {
  it("sets a class's schedule and syncs its cycleDays", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);
    const schoolYearId = plannerData.schoolYear.id;

    const conflicts = setClassSchedule(db, "grade-6-math", [
      { cycleDay: 1, startTime: "09:43", endTime: "10:45" },
    ]);

    expect(conflicts).toEqual([]);
    expect(getScheduleSlots(db, schoolYearId)).toEqual([
      {
        id: expect.any(String),
        classId: "grade-6-math",
        cycleDay: 1,
        startTime: "09:43",
        endTime: "10:45",
      },
    ]);
    expect(getClassById(db, "grade-6-math")?.cycleDays).toEqual([1]);
  });

  it("sets multiple days in one call", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    setClassSchedule(db, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "09:50" },
      { cycleDay: 2, startTime: "09:00", endTime: "09:50" },
      { cycleDay: 3, startTime: "10:00", endTime: "10:50" },
    ]);

    const slots = getScheduleSlotsForClass(db, "grade-6-math");
    expect(slots).toHaveLength(3);
    expect(getClassById(db, "grade-6-math")?.cycleDays).toEqual([1, 2, 3]);
  });

  it("replaces a class's existing schedule rather than appending to it", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    setClassSchedule(db, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "09:50" },
    ]);
    setClassSchedule(db, "grade-6-math", [
      { cycleDay: 2, startTime: "10:00", endTime: "10:50" },
    ]);

    const slots = getScheduleSlotsForClass(db, "grade-6-math");
    expect(slots).toHaveLength(1);
    expect(slots[0].cycleDay).toBe(2);
  });

  it("clears a class's schedule when given an empty list", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    setClassSchedule(db, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "09:50" },
    ]);
    setClassSchedule(db, "grade-6-math", []);

    expect(getScheduleSlotsForClass(db, "grade-6-math")).toEqual([]);
    expect(getClassById(db, "grade-6-math")?.cycleDays).toEqual([]);
  });

  it("flags a conflict when another class overlaps on the same cycle day", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    setClassSchedule(db, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "10:00" },
    ]);

    const conflicts = setClassSchedule(db, "grade-6-science", [
      { cycleDay: 1, startTime: "09:30", endTime: "10:30" },
    ]);

    expect(conflicts).toEqual([{ cycleDay: 1, className: "Grade 6 Math" }]);
    // Still assigned despite the conflict — warning, not a block.
    expect(getScheduleSlotsForClass(db, "grade-6-science")).toHaveLength(1);
  });

  it("does not flag a conflict for adjacent (non-overlapping) times", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    setClassSchedule(db, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "10:00" },
    ]);

    const conflicts = setClassSchedule(db, "grade-6-science", [
      { cycleDay: 1, startTime: "10:00", endTime: "11:00" },
    ]);

    expect(conflicts).toEqual([]);
  });

  it("does not flag a conflict for the same class's own slots", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    const conflicts = setClassSchedule(db, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "10:00" },
      { cycleDay: 1, startTime: "09:30", endTime: "10:30" },
    ]);

    expect(conflicts).toEqual([]);
  });

  it("does not flag a conflict for a different cycle day", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    setClassSchedule(db, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "10:00" },
    ]);

    const conflicts = setClassSchedule(db, "grade-6-science", [
      { cycleDay: 2, startTime: "09:00", endTime: "10:00" },
    ]);

    expect(conflicts).toEqual([]);
  });

  it("cascades slot deletion when the class is deleted", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);
    const schoolYearId = plannerData.schoolYear.id;

    const classId = createClass(db, {
      schoolYearId,
      name: "Temp Class",
      subject: "Temp",
      grade: "6",
      room: "",
      meetingPattern: "",
      cycleDays: [],
    });
    setClassSchedule(db, classId, [{ cycleDay: 1, startTime: "09:00", endTime: "09:50" }]);

    db.prepare("DELETE FROM class_sections WHERE id = ?").run(classId);

    expect(getScheduleSlots(db, schoolYearId).some((slot) => slot.classId === classId)).toBe(
      false,
    );
  });
});
