// @vitest-environment node
//
// Vitest's default environment (jsdom, set globally in vitest.config.ts) is a
// browser-like sandbox that can't bundle the Node-only `node:sqlite` module
// this file (transitively) imports. Force the real Node environment here.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createClassPilotDatabase } from "./sqlite";
import { createUser } from "./users-repository";
import {
  createClass,
  createSchoolYear,
  createUnitWithLessons,
  getUnitById,
  seedPlannerData,
} from "./planner-repository";
import {
  createScheduleException,
  deleteScheduleException,
  getScheduleExceptions,
} from "./schedule-exceptions-repository";
import { plannerData } from "@/src/features/planner/seed-data";

function temporaryDatabasePath() {
  return join(mkdtempSync(join(tmpdir(), "classpilot-test-")), "test.sqlite");
}

describe("schedule exceptions repository", () => {
  it("creates an exception on an empty date without shifting any lesson", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    // Instructional days: ...09-08, 09-09, 09-10, 09-11, 09-14, 09-15...
    createUnitWithLessons(db, userId, {
      unit: {
        classId: "grade-6-math",
        endDate: "2026-09-11",
        outcomeIds: [],
        startDate: "2026-09-08",
        title: "Exception Test Unit",
      },
      lessons: [
        { title: "Lesson 1", date: "2026-09-08", durationMinutes: 45, outcomeIds: [], status: "planned", summary: "" },
      ],
    });

    const result = createScheduleException(db, userId, {
      classId: "grade-6-math",
      date: "2026-09-09",
      label: "Assembly",
    });

    expect(result.shiftedLessonCount).toBe(0);

    const exceptions = getScheduleExceptions(db, userId, "current");
    expect(exceptions).toEqual([
      { classId: "grade-6-math", date: "2026-09-09", id: result.exceptionId, label: "Assembly" },
    ]);
  });

  it("cancelling a class on a date with a lesson shifts it (and everything after) forward one meeting day", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    const unitId = createUnitWithLessons(db, userId, {
      unit: {
        classId: "grade-6-math",
        endDate: "2026-09-15",
        outcomeIds: [],
        startDate: "2026-09-08",
        title: "Exception Cascade Test Unit",
      },
      lessons: [
        { title: "Lesson 1", date: "2026-09-08", durationMinutes: 45, outcomeIds: [], status: "planned", summary: "" },
        { title: "Lesson 2", date: "2026-09-09", durationMinutes: 45, outcomeIds: [], status: "planned", summary: "" },
        { title: "Lesson 3", date: "2026-09-10", durationMinutes: 45, outcomeIds: [], status: "planned", summary: "" },
      ],
    });

    const before = getUnitById(db, userId, unitId)!;
    const lesson1 = before.lessons.find((lesson) => lesson.title === "Lesson 1")!;
    const lesson2 = before.lessons.find((lesson) => lesson.title === "Lesson 2")!;
    const lesson3 = before.lessons.find((lesson) => lesson.title === "Lesson 3")!;

    const result = createScheduleException(db, userId, {
      classId: "grade-6-math",
      date: "2026-09-09",
      label: "Fire drill",
    });

    expect(result.shiftedLessonCount).toBe(2);

    const after = getUnitById(db, userId, unitId)!;
    expect(after.lessons.find((lesson) => lesson.id === lesson1.id)?.date).toBe("2026-09-08");
    expect(after.lessons.find((lesson) => lesson.id === lesson2.id)?.date).toBe("2026-09-10");
    expect(after.lessons.find((lesson) => lesson.id === lesson3.id)?.date).toBe("2026-09-11");
  });

  it("cancelling the same class+date twice updates the label instead of duplicating the row", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    const first = createScheduleException(db, userId, {
      classId: "grade-6-math",
      date: "2026-09-09",
      label: "Assembly",
    });
    const second = createScheduleException(db, userId, {
      classId: "grade-6-math",
      date: "2026-09-09",
      label: "Fire drill",
    });

    expect(second.exceptionId).toBe(first.exceptionId);

    const exceptions = getScheduleExceptions(db, userId, "current");
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0].label).toBe("Fire drill");
  });

  it("deleting an exception removes it without moving any already-shifted lesson back", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    const unitId = createUnitWithLessons(db, userId, {
      unit: {
        classId: "grade-6-math",
        endDate: "2026-09-11",
        outcomeIds: [],
        startDate: "2026-09-08",
        title: "Restore Test Unit",
      },
      lessons: [
        { title: "Lesson 1", date: "2026-09-08", durationMinutes: 45, outcomeIds: [], status: "planned", summary: "" },
        { title: "Lesson 2", date: "2026-09-09", durationMinutes: 45, outcomeIds: [], status: "planned", summary: "" },
      ],
    });

    const before = getUnitById(db, userId, unitId)!;
    const lesson2 = before.lessons.find((lesson) => lesson.title === "Lesson 2")!;

    const { exceptionId } = createScheduleException(db, userId, {
      classId: "grade-6-math",
      date: "2026-09-09",
      label: "Assembly",
    });

    deleteScheduleException(db, userId, exceptionId);

    expect(getScheduleExceptions(db, userId, "current")).toEqual([]);
    const after = getUnitById(db, userId, unitId)!;
    expect(after.lessons.find((lesson) => lesson.id === lesson2.id)?.date).toBe("2026-09-10");
  });

  it("defaults the label to the substitute class's name when no label is given", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    const result = createScheduleException(db, userId, {
      classId: "grade-6-math",
      date: "2026-09-09",
      label: "",
      substituteClassId: "grade-6-science",
    });

    const exceptions = getScheduleExceptions(db, userId, "current");
    expect(exceptions).toEqual([
      {
        classId: "grade-6-math",
        date: "2026-09-09",
        id: result.exceptionId,
        label: "Grade 6 Science",
        substituteClassId: "grade-6-science",
      },
    ]);
  });

  it("throws when the substitute class doesn't belong to the user", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    const otherUserId = createUser(db, { username: "other-teacher", password: "x" }).id;
    const otherSchoolYearId = createSchoolYear(db, otherUserId, {
      title: "Other Teacher's Year",
      startDate: "2026-09-01",
      endDate: "2027-06-30",
      cycleLength: 1,
    });
    const otherClassId = createClass(db, otherUserId, {
      schoolYearId: otherSchoolYearId,
      name: "Someone Else's Class",
      subject: "Science",
      grade: "6",
      room: "",
      meetingPattern: "",
      cycleDays: [],
    });

    expect(() =>
      createScheduleException(db, userId, {
        classId: "grade-6-math",
        date: "2026-09-09",
        label: "",
        substituteClassId: otherClassId,
      }),
    ).toThrow("Class not found");
  });

  it("throws when cancelling a class that doesn't belong to the user", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    expect(() =>
      createScheduleException(db, userId, {
        classId: "class-does-not-exist",
        date: "2026-09-09",
        label: "Assembly",
      }),
    ).toThrow("Class not found");
  });

  it("throws when restoring a nonexistent exception", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    expect(() => deleteScheduleException(db, userId, "exception-does-not-exist")).toThrow(
      "Schedule exception not found",
    );
  });
});
