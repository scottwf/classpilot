// @vitest-environment node
//
// Vitest's default environment (jsdom, set globally in vitest.config.ts) is a
// browser-like sandbox that can't bundle the Node-only `node:sqlite` module
// this file (transitively) imports. Force the real Node environment here.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCycleDayMap } from "@/src/features/planner/cycle";
import { plannerData } from "@/src/features/planner/seed-data";
import {
  createClass,
  createLesson,
  createUnit,
  getClassById,
  getUnitById,
  seedPlannerData,
} from "./planner-repository";
import {
  addTemporaryScheduleSlot,
  deleteScheduleSlot,
  getScheduleSlots,
  getScheduleSlotsForClass,
  setClassSchedule,
} from "./schedule-repository";
import { createClassPilotDatabase } from "./sqlite";
import { createUser } from "./users-repository";

function temporaryDatabasePath() {
  return join(mkdtempSync(join(tmpdir(), "classpilot-test-")), "test.sqlite");
}

describe("schedule repository", () => {
  it("sets a class's schedule and syncs its cycleDays", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);
    const schoolYearId = plannerData.schoolYear.id;

    const conflicts = setClassSchedule(db, userId, "grade-6-math", [
      { cycleDay: 1, startTime: "09:43", endTime: "10:45" },
    ]);

    expect(conflicts).toEqual([]);
    expect(getScheduleSlots(db, userId, schoolYearId)).toEqual([
      {
        id: expect.any(String),
        classId: "grade-6-math",
        cycleDay: 1,
        startTime: "09:43",
        endTime: "10:45",
      },
    ]);
    expect(getClassById(db, userId, "grade-6-math")?.cycleDays).toEqual([1]);
  });

  it("sets multiple days in one call", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    setClassSchedule(db, userId, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "09:50" },
      { cycleDay: 2, startTime: "09:00", endTime: "09:50" },
      { cycleDay: 3, startTime: "10:00", endTime: "10:50" },
    ]);

    const slots = getScheduleSlotsForClass(db, userId, "grade-6-math");
    expect(slots).toHaveLength(3);
    expect(getClassById(db, userId, "grade-6-math")?.cycleDays).toEqual([1, 2, 3]);
  });

  it("replaces a class's existing schedule rather than appending to it", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    setClassSchedule(db, userId, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "09:50" },
    ]);
    setClassSchedule(db, userId, "grade-6-math", [
      { cycleDay: 2, startTime: "10:00", endTime: "10:50" },
    ]);

    const slots = getScheduleSlotsForClass(db, userId, "grade-6-math");
    expect(slots).toHaveLength(1);
    expect(slots[0].cycleDay).toBe(2);
  });

  it("clears a class's schedule when given an empty list", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    setClassSchedule(db, userId, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "09:50" },
    ]);
    setClassSchedule(db, userId, "grade-6-math", []);

    expect(getScheduleSlotsForClass(db, userId, "grade-6-math")).toEqual([]);
    expect(getClassById(db, userId, "grade-6-math")?.cycleDays).toEqual([]);
  });

  it("flags a conflict when another class overlaps on the same cycle day", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    setClassSchedule(db, userId, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "10:00" },
    ]);

    const conflicts = setClassSchedule(db, userId, "grade-6-science", [
      { cycleDay: 1, startTime: "09:30", endTime: "10:30" },
    ]);

    expect(conflicts).toEqual([{ cycleDay: 1, className: "Grade 6 Math" }]);
    // Still assigned despite the conflict — warning, not a block.
    expect(getScheduleSlotsForClass(db, userId, "grade-6-science")).toHaveLength(1);
  });

  it("does not flag a conflict for adjacent (non-overlapping) times", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    setClassSchedule(db, userId, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "10:00" },
    ]);

    const conflicts = setClassSchedule(db, userId, "grade-6-science", [
      { cycleDay: 1, startTime: "10:00", endTime: "11:00" },
    ]);

    expect(conflicts).toEqual([]);
  });

  it("does not flag a conflict for the same class's own slots", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    const conflicts = setClassSchedule(db, userId, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "10:00" },
      { cycleDay: 1, startTime: "09:30", endTime: "10:30" },
    ]);

    expect(conflicts).toEqual([]);
  });

  it("does not flag a conflict for a different cycle day", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    setClassSchedule(db, userId, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "10:00" },
    ]);

    const conflicts = setClassSchedule(db, userId, "grade-6-science", [
      { cycleDay: 2, startTime: "09:00", endTime: "10:00" },
    ]);

    expect(conflicts).toEqual([]);
  });

  it("cascades slot deletion when the class is deleted", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);
    const schoolYearId = plannerData.schoolYear.id;

    const classId = createClass(db, userId, {
      schoolYearId,
      name: "Temp Class",
      subject: "Temp",
      grade: "6",
      room: "",
      meetingPattern: "",
      cycleDays: [],
    });
    setClassSchedule(db, userId, classId, [{ cycleDay: 1, startTime: "09:00", endTime: "09:50" }]);

    db.prepare("DELETE FROM class_sections WHERE id = ?").run(classId);

    expect(getScheduleSlots(db, userId, schoolYearId).some((slot) => slot.classId === classId)).toBe(
      false,
    );
  });

  it("adds a temporary slot without touching the class's regular slots", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    setClassSchedule(db, userId, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "09:50" },
    ]);

    const notices = addTemporaryScheduleSlot(db, userId, "grade-6-science", {
      cycleDay: 2,
      startTime: "13:00",
      endTime: "13:50",
      startDate: "2026-10-01",
      endDate: "2026-10-14",
    });

    expect(notices).toEqual([]);

    const mathSlots = getScheduleSlotsForClass(db, userId, "grade-6-math");
    expect(mathSlots).toHaveLength(1);
    expect(mathSlots[0].startDate).toBeUndefined();

    expect(getScheduleSlotsForClass(db, userId, "grade-6-science")).toEqual([
      {
        id: expect.any(String),
        classId: "grade-6-science",
        cycleDay: 2,
        startTime: "13:00",
        endTime: "13:50",
        startDate: "2026-10-01",
        endDate: "2026-10-14",
      },
    ]);
  });

  it("unions the temporary slot's cycleDay into the class's cycleDays snapshot (issue #16)", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    const classId = createClass(db, userId, {
      schoolYearId: plannerData.schoolYear.id,
      name: "Career Ed",
      subject: "Career Education",
      grade: "6",
      room: "",
      meetingPattern: "",
      cycleDays: [],
    });

    // Before any schedule, cycleDays is empty (meets "every instructional
    // day" per getClassMeetingDates' fallback) -- a class scheduled only via
    // a temporary slot must not stay in that state, or cascade-reschedule
    // and "extend to next day" will treat it as meeting every day.
    expect(getClassById(db, userId, classId)?.cycleDays).toEqual([]);

    addTemporaryScheduleSlot(db, userId, classId, {
      cycleDay: 1,
      startTime: "13:00",
      endTime: "13:50",
      startDate: "2026-11-01",
      endDate: "2026-12-18",
    });

    expect(getClassById(db, userId, classId)?.cycleDays).toEqual([1]);
  });

  it("unions a new temporary slot's cycleDay with existing cycleDays instead of overwriting them", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    setClassSchedule(db, userId, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "09:50" },
    ]);
    expect(getClassById(db, userId, "grade-6-math")?.cycleDays).toEqual([1]);

    addTemporaryScheduleSlot(db, userId, "grade-6-math", {
      cycleDay: 3,
      startTime: "13:00",
      endTime: "13:50",
      startDate: "2026-10-01",
      endDate: "2026-10-14",
    });

    expect(getClassById(db, userId, "grade-6-math")?.cycleDays).toEqual([1, 3]);
  });

  it("does not delete a class's temporary slots when its regular schedule is re-saved", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    addTemporaryScheduleSlot(db, userId, "grade-6-math", {
      cycleDay: 1,
      startTime: "09:00",
      endTime: "09:50",
      startDate: "2026-10-01",
      endDate: "2026-10-14",
    });
    setClassSchedule(db, userId, "grade-6-math", [
      { cycleDay: 3, startTime: "11:00", endTime: "11:50" },
    ]);

    const slots = getScheduleSlotsForClass(db, userId, "grade-6-math");
    expect(slots).toHaveLength(2);
    expect(slots.filter((slot) => slot.startDate).length).toBe(1);
    expect(slots.filter((slot) => !slot.startDate).length).toBe(1);
  });

  it("treats an overlapping regular slot as a swap and cascades the displaced class's lessons forward", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    setClassSchedule(db, userId, "grade-6-math", [
      { cycleDay: 1, startTime: "09:00", endTime: "09:50" },
    ]);

    const unitId = createUnit(db, userId, {
      classId: "grade-6-math",
      color: "blue",
      startDate: "2026-09-01",
      endDate: "2026-10-30",
      outcomeIds: [],
      title: "Displaced Unit",
    });

    // Find a real cycle-day-1 date inside the swap window to place a lesson on.
    const cycleDayMap = buildCycleDayMap(plannerData.schoolYear);
    const windowStart = "2026-10-01";
    const windowEnd = "2026-10-14";
    const displacedDate = Array.from(cycleDayMap.entries()).find(
      ([date, day]) => day === 1 && date >= windowStart && date <= windowEnd,
    )?.[0];

    if (!displacedDate) {
      throw new Error("Expected a cycle-day-1 date in the test window");
    }

    const lessonId = createLesson(db, userId, {
      date: displacedDate,
      durationMinutes: 50,
      outcomeIds: [],
      status: "planned",
      summary: "Displaced lesson",
      title: "Displaced lesson",
      unitId,
    });

    const notices = addTemporaryScheduleSlot(db, userId, "grade-6-science", {
      cycleDay: 1,
      startTime: "09:00",
      endTime: "09:50",
      startDate: windowStart,
      endDate: windowEnd,
    });

    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      displacedClassId: "grade-6-math",
      displacedClassName: "Grade 6 Math",
    });
    expect(notices[0].displacedOccurrences).toBeGreaterThan(0);
    expect(notices[0].shiftedUnits).toEqual([
      { unitId, unitTitle: "Displaced Unit", shiftedLessonCount: 1 },
    ]);

    const unit = getUnitById(db, userId, unitId);
    const movedLesson = unit?.lessons.find((lesson) => lesson.id === lessonId);
    expect(movedLesson?.date).not.toBe(displacedDate);
    expect(movedLesson?.date).toBeDefined();
    if (movedLesson) {
      expect(movedLesson.date > windowEnd).toBe(true);
    }
  });

  it("does not report a swap notice when there is nothing to displace", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    const notices = addTemporaryScheduleSlot(db, userId, "grade-6-science", {
      cycleDay: 4,
      startTime: "09:00",
      endTime: "09:50",
      startDate: "2026-10-01",
      endDate: "2026-10-14",
    });

    expect(notices).toEqual([]);
  });

  it("deletes a temporary slot", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    addTemporaryScheduleSlot(db, userId, "grade-6-science", {
      cycleDay: 2,
      startTime: "13:00",
      endTime: "13:50",
      startDate: "2026-10-01",
      endDate: "2026-10-14",
    });
    const [slot] = getScheduleSlotsForClass(db, userId, "grade-6-science");

    deleteScheduleSlot(db, userId, slot!.id);

    expect(getScheduleSlotsForClass(db, userId, "grade-6-science")).toEqual([]);
  });
});
