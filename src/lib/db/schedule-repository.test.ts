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
import { createClass, createSchoolYear, getClassById, seedPlannerData } from "./planner-repository";
import {
  assignScheduleSlot,
  createPeriod,
  deletePeriod,
  getPeriods,
  getScheduleSlots,
  removeScheduleSlot,
  updatePeriod,
} from "./schedule-repository";
import { createClassPilotDatabase } from "./sqlite";

function temporaryDatabasePath() {
  return join(mkdtempSync(join(tmpdir(), "classpilot-test-")), "test.sqlite");
}

describe("schedule repository", () => {
  it("creates, updates, and deletes periods", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const schoolYearId = createSchoolYear(db, {
      title: "Test Year",
      startDate: "2026-09-01",
      endDate: "2026-06-30",
      cycleLength: 5,
    });

    const periodId = createPeriod(db, {
      schoolYearId,
      label: "Period 1",
      startTime: "08:40",
      endTime: "09:43",
      sortOrder: 1,
    });

    expect(getPeriods(db, schoolYearId)).toEqual([
      {
        id: periodId,
        schoolYearId,
        label: "Period 1",
        startTime: "08:40",
        endTime: "09:43",
        sortOrder: 1,
      },
    ]);

    updatePeriod(db, {
      id: periodId,
      label: "Period 1 (renamed)",
      startTime: "08:45",
      endTime: "09:45",
      sortOrder: 1,
    });

    expect(getPeriods(db, schoolYearId)[0]).toMatchObject({
      label: "Period 1 (renamed)",
      startTime: "08:45",
    });

    deletePeriod(db, periodId);
    expect(getPeriods(db, schoolYearId)).toEqual([]);
  });

  it("orders periods by sortOrder then startTime", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const schoolYearId = createSchoolYear(db, {
      title: "Test Year",
      startDate: "2026-09-01",
      endDate: "2026-06-30",
      cycleLength: 5,
    });

    createPeriod(db, { schoolYearId, label: "Period 2", startTime: "09:43", endTime: "10:45", sortOrder: 2 });
    createPeriod(db, { schoolYearId, label: "Period 1", startTime: "08:40", endTime: "09:43", sortOrder: 1 });

    expect(getPeriods(db, schoolYearId).map((period) => period.label)).toEqual(["Period 1", "Period 2"]);
  });

  it("throws when updating a nonexistent period", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    expect(() =>
      updatePeriod(db, {
        id: "period-does-not-exist",
        label: "X",
        startTime: "08:00",
        endTime: "09:00",
        sortOrder: 1,
      }),
    ).toThrow("Period not found");
  });

  it("assigns a class to a slot and syncs the class's cycleDays", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);
    const schoolYearId = plannerData.schoolYear.id;

    const periodId = createPeriod(db, {
      schoolYearId,
      label: "Period 2",
      startTime: "09:43",
      endTime: "10:45",
      sortOrder: 2,
    });

    const result = assignScheduleSlot(db, {
      classId: "grade-6-math",
      periodId,
      cycleDay: 1,
    });

    expect(result.conflictClassName).toBeUndefined();
    expect(getScheduleSlots(db, schoolYearId)).toEqual([
      { id: result.id, classId: "grade-6-math", periodId, cycleDay: 1 },
    ]);
    expect(getClassById(db, "grade-6-math")?.cycleDays).toContain(1);
  });

  it("replaces a class's existing slot on the same cycle day rather than duplicating", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);
    const schoolYearId = plannerData.schoolYear.id;

    const period1 = createPeriod(db, { schoolYearId, label: "P1", startTime: "08:00", endTime: "09:00", sortOrder: 1 });
    const period2 = createPeriod(db, { schoolYearId, label: "P2", startTime: "09:00", endTime: "10:00", sortOrder: 2 });

    assignScheduleSlot(db, { classId: "grade-6-math", periodId: period1, cycleDay: 1 });
    assignScheduleSlot(db, { classId: "grade-6-math", periodId: period2, cycleDay: 1 });

    const slots = getScheduleSlots(db, schoolYearId).filter((slot) => slot.classId === "grade-6-math");
    expect(slots).toHaveLength(1);
    expect(slots[0].periodId).toBe(period2);
  });

  it("flags a conflict when a different class already holds that (day, period) but still assigns it", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);
    const schoolYearId = plannerData.schoolYear.id;

    const periodId = createPeriod(db, { schoolYearId, label: "P1", startTime: "08:00", endTime: "09:00", sortOrder: 1 });

    assignScheduleSlot(db, { classId: "grade-6-math", periodId, cycleDay: 1 });
    const second = assignScheduleSlot(db, { classId: "grade-6-science", periodId, cycleDay: 1 });

    expect(second.conflictClassName).toBe("Grade 6 Math");
    const slots = getScheduleSlots(db, schoolYearId).filter((slot) => slot.cycleDay === 1 && slot.periodId === periodId);
    expect(slots.map((slot) => slot.classId).sort()).toEqual(["grade-6-math", "grade-6-science"]);
  });

  it("removes a slot without touching the class's cycleDays", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);
    const schoolYearId = plannerData.schoolYear.id;

    const periodId = createPeriod(db, { schoolYearId, label: "P1", startTime: "08:00", endTime: "09:00", sortOrder: 1 });
    const { id } = assignScheduleSlot(db, { classId: "grade-6-math", periodId, cycleDay: 1 });

    removeScheduleSlot(db, id);

    expect(getScheduleSlots(db, schoolYearId)).toEqual([]);
    expect(getClassById(db, "grade-6-math")?.cycleDays).toContain(1);
  });

  it("cascades slot deletion when the period is deleted", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);
    const schoolYearId = plannerData.schoolYear.id;

    const periodId = createPeriod(db, { schoolYearId, label: "P1", startTime: "08:00", endTime: "09:00", sortOrder: 1 });
    assignScheduleSlot(db, { classId: "grade-6-math", periodId, cycleDay: 1 });

    deletePeriod(db, periodId);

    expect(getScheduleSlots(db, schoolYearId)).toEqual([]);
  });

  it("cascades slot deletion when the class is deleted", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);
    const schoolYearId = plannerData.schoolYear.id;

    const periodId = createPeriod(db, { schoolYearId, label: "P1", startTime: "08:00", endTime: "09:00", sortOrder: 1 });
    const classId = createClass(db, {
      schoolYearId,
      name: "Temp Class",
      subject: "Temp",
      grade: "6",
      room: "",
      meetingPattern: "",
      cycleDays: [],
    });
    assignScheduleSlot(db, { classId, periodId, cycleDay: 1 });

    db.prepare("DELETE FROM class_sections WHERE id = ?").run(classId);

    expect(getScheduleSlots(db, schoolYearId)).toEqual([]);
  });
});
