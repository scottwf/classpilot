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
import {
  cascadeRescheduleUnitLessons,
  createClass,
  createLesson,
  createSchoolYear,
  createUnit,
  createUnitWithLessons,
  deleteClass,
  deleteSchoolYear,
  duplicateLessonAsContinuation,
  getActiveSchoolYearId,
  getClassById,
  getLessonById,
  getPlannerData,
  getSchoolYear,
  getSchoolYearById,
  getUnitById,
  listSchoolYears,
  seedPlannerData,
  setActiveSchoolYear,
  updateClass,
  updateLesson,
  updateSchoolYear,
  updateUnit,
  updateUnitDates,
} from "./planner-repository";
import { plannerData } from "@/src/features/planner/seed-data";

function temporaryDatabasePath() {
  return join(mkdtempSync(join(tmpdir(), "classpilot-test-")), "test.sqlite");
}

describe("planner repository", () => {
  it("seeds and reads Grade 6 homeroom planner data from SQLite", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    const persistedPlanner = getPlannerData(db);

    expect(persistedPlanner.schoolYear.title).toBe(
      "2026-2027 Grade 6 Homeroom",
    );
    expect(persistedPlanner.classes.map((classSection) => classSection.name)).toContain(
      "Grade 6 Math",
    );
    expect(persistedPlanner.units.map((unit) => unit.title)).toContain(
      "Ratios, Rates, and Percent",
    );
    expect(
      persistedPlanner.units.find(
        (unit) => unit.title === "Ratios, Rates, and Percent",
      )?.lessons,
    ).toHaveLength(2);
  });

  it("can seed the same planner more than once without duplicating rows", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    seedPlannerData(db, plannerData);
    const persistedPlanner = getPlannerData(db);

    expect(persistedPlanner.classes).toHaveLength(plannerData.classes.length);
    expect(persistedPlanner.units).toHaveLength(plannerData.units.length);
    expect(persistedPlanner.outcomes).toHaveLength(plannerData.outcomes.length);
  });

  it("creates a lesson and reads it through the planner model", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    createLesson(db, {
      date: "2026-09-24",
      durationMinutes: 45,
      outcomeIds: [],
      status: "planned",
      summary: "Use grocery flyers to compare ratios and percent discounts.",
      title: "Percent in Flyers",
      unitId: "unit-ratios",
    });

    const persistedPlanner = getPlannerData(db);
    const mathUnit = persistedPlanner.units.find(
      (unit) => unit.id === "unit-ratios",
    );

    expect(mathUnit?.lessons.map((lesson) => lesson.title)).toContain(
      "Percent in Flyers",
    );
  });

  it("creates a unit with its lessons atomically", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    const classId = getPlannerData(db).classes[0].id;

    const unitId = createUnitWithLessons(db, {
      unit: {
        classId,
        color: "violet",
        endDate: "2026-10-09",
        outcomeIds: ["sk-grade-6-mathematics-n6-5"],
        startDate: "2026-09-28",
        title: "Electricity (AI draft)",
      },
      lessons: [
        {
          date: "2026-09-28",
          durationMinutes: 45,
          outcomeIds: ["sk-grade-6-mathematics-n6-5"],
          status: "planned",
          summary: "Explore static charge.",
          title: "Static charge",
        },
        {
          date: "2026-09-30",
          durationMinutes: 45,
          outcomeIds: [],
          status: "planned",
          summary: "Build a simple circuit.",
          title: "Build a circuit",
        },
      ],
    });

    const unit = getUnitById(db, unitId);

    expect(unit?.title).toBe("Electricity (AI draft)");
    expect(unit?.outcomeIds).toEqual(["sk-grade-6-mathematics-n6-5"]);
    expect(unit?.lessons.map((lesson) => lesson.title)).toEqual([
      "Static charge",
      "Build a circuit",
    ]);
  });

  it("rolls back the unit when a lesson insert fails", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    const classId = getPlannerData(db).classes[0].id;
    const unitCountBefore = getPlannerData(db).units.length;

    expect(() =>
      createUnitWithLessons(db, {
        unit: {
          classId,
          color: "blue",
          endDate: "2026-10-09",
          outcomeIds: [],
          startDate: "2026-09-28",
          title: "Doomed unit",
        },
        lessons: [
          {
            // durationMinutes is non-null in the schema; null forces a failure
            // mid-transaction so we can assert the unit was rolled back.
            date: "2026-09-28",
            durationMinutes: null as unknown as number,
            outcomeIds: [],
            status: "planned",
            summary: "This insert should fail.",
            title: "Bad lesson",
          },
        ],
      }),
    ).toThrow();

    expect(getPlannerData(db).units).toHaveLength(unitCountBefore);
  });

  it("creates and updates structured lesson sections", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    const lessonId = createLesson(db, {
      date: "2026-09-24",
      durationMinutes: 45,
      outcomeIds: [],
      sections: {
        assessment: "Collect exit slips.",
        differentiation: "Offer ratio tables with partial labels.",
        learningGoals: "I can compare ratios in real examples.",
        lessonFlow: "Model one flyer example, then partner practice.",
        materials: "Grocery flyers, calculators, notebooks.",
        mindsOn: "Which deal is better?",
        reflection: "",
        resources: "https://example.com/ratio-flyers",
      },
      status: "planned",
      summary: "Use grocery flyers to compare ratios and percent discounts.",
      title: "Percent in Flyers",
      unitId: "unit-ratios",
    });

    updateLesson(db, {
      date: "2026-09-24",
      durationMinutes: 50,
      id: lessonId,
      outcomeIds: [],
      sections: {
        assessment: "Sort exit slips by confidence.",
        differentiation: "Meet with students who need unit-rate support.",
        learningGoals: "I can justify which flyer deal is better.",
        lessonFlow: "Compare examples, partner sort, written justification.",
        materials: "Flyers, highlighters, calculators.",
        mindsOn: "Estimate the better deal before calculating.",
        reflection: "Add more visual models next time.",
        resources: "https://example.com/unit-rate-video",
      },
      status: "planned",
      summary: "Compare flyer deals with ratio and percent reasoning.",
      title: "Percent in Flyers",
      unitId: "unit-ratios",
    });

    const lesson = getLessonById(db, lessonId);

    expect(lesson?.sections).toMatchObject({
      learningGoals: "I can justify which flyer deal is better.",
      materials: "Flyers, highlighters, calculators.",
      resources: "https://example.com/unit-rate-video",
      reflection: "Add more visual models next time.",
    });
  });

  it("updates an existing lesson and returns the edited values", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    updateLesson(db, {
      date: "2026-09-25",
      durationMinutes: 60,
      id: "lesson-ratio-language",
      outcomeIds: ["sk-grade-6-mathematics-n6-5"],
      status: "taught",
      summary: "Revised lesson after teaching ratio language.",
      title: "Ratio Language Reflection",
      unitId: "unit-ratios",
    });

    const lesson = getLessonById(db, "lesson-ratio-language");

    expect(lesson).toMatchObject({
      date: "2026-09-25",
      durationMinutes: 60,
      status: "taught",
      summary: "Revised lesson after teaching ratio language.",
      title: "Ratio Language Reflection",
      unitId: "unit-ratios",
    });
    expect(lesson?.outcomeIds).toEqual(["sk-grade-6-mathematics-n6-5"]);
  });

  it("reads and updates the school year calendar", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    const seeded = getSchoolYear(db);
    expect(seeded.blockedDates).toContainEqual({
      date: "2026-10-12",
      label: "Thanksgiving",
      advancesCycle: true,
    });

    updateSchoolYear(db, {
      id: seeded.id,
      title: "2027-2028 Grade 6 Homeroom",
      startDate: "2027-09-01",
      endDate: "2027-12-18",
      cycleLength: 6,
      blockedDates: [
        { date: "2027-11-11", label: "Remembrance Day", advancesCycle: true },
        { date: "2027-10-11", label: "Thanksgiving", advancesCycle: false },
      ],
    });

    const updated = getSchoolYear(db);
    expect(updated.title).toBe("2027-2028 Grade 6 Homeroom");
    expect(updated.startDate).toBe("2027-09-01");
    expect(updated.cycleLength).toBe(6);
    // Stored sorted by date.
    expect(updated.blockedDates.map((day) => day.date)).toEqual([
      "2027-10-11",
      "2027-11-11",
    ]);
    expect(updated.blockedDates.map((day) => day.advancesCycle)).toEqual([
      false,
      true,
    ]);
  });

  it("normalizes a legacy string-array of blocked dates on read", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    db.prepare("UPDATE school_years SET blocked_dates_json = ? WHERE id = ?").run(
      JSON.stringify(["2026-09-07", "2026-10-12"]),
      "current",
    );

    const schoolYear = getSchoolYear(db);
    expect(schoolYear.blockedDates).toEqual([
      { date: "2026-09-07", label: "", advancesCycle: true },
      { date: "2026-10-12", label: "", advancesCycle: true },
    ]);
  });

  it("defaults advancesCycle to true for pre-cycle-system object entries", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    db.prepare("UPDATE school_years SET blocked_dates_json = ? WHERE id = ?").run(
      JSON.stringify([{ date: "2026-09-07", label: "Labour Day" }]),
      "current",
    );

    const schoolYear = getSchoolYear(db);
    expect(schoolYear.blockedDates).toEqual([
      { date: "2026-09-07", label: "Labour Day", advancesCycle: true },
    ]);
  });

  it("creates, updates, and deletes a class", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    const classId = createClass(db, {
      schoolYearId: "current",
      name: "Grade 6 French",
      subject: "French",
      grade: "6",
      room: "Homeroom",
      meetingPattern: "",
      cycleDays: [1, 3],
    });

    expect(getClassById(db, classId)).toMatchObject({
      name: "Grade 6 French",
      subject: "French",
      cycleDays: [1, 3],
    });

    updateClass(db, {
      id: classId,
      schoolYearId: "current",
      name: "Grade 6 Français",
      subject: "French",
      grade: "6",
      room: "Room 12",
      meetingPattern: "",
      cycleDays: [2, 4],
    });

    expect(getClassById(db, classId)).toMatchObject({
      name: "Grade 6 Français",
      room: "Room 12",
      cycleDays: [2, 4],
    });

    deleteClass(db, classId);
    expect(getClassById(db, classId)).toBeUndefined();
  });

  it("stores and updates a class's combined grades", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    const classId = createClass(db, {
      schoolYearId: "current",
      name: "Grade 5/6 Split",
      subject: "Mathematics",
      grade: "6",
      room: "Room 3",
      meetingPattern: "",
      cycleDays: [],
      combinedGrades: ["5"],
    });

    expect(getClassById(db, classId)).toMatchObject({
      grade: "6",
      combinedGrades: ["5"],
    });

    updateClass(db, {
      id: classId,
      schoolYearId: "current",
      name: "Grade 5/6 Split",
      subject: "Mathematics",
      grade: "6",
      room: "Room 3",
      meetingPattern: "",
      cycleDays: [],
      combinedGrades: [],
    });

    expect(getClassById(db, classId)).toMatchObject({ combinedGrades: [] });
  });

  it("defaults combinedGrades to an empty array when omitted", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    const classId = createClass(db, {
      schoolYearId: "current",
      name: "Grade 6 French",
      subject: "French",
      grade: "6",
      room: "",
      meetingPattern: "",
      cycleDays: [],
    });

    expect(getClassById(db, classId)).toMatchObject({ combinedGrades: [] });
  });

  it("throws when updating a nonexistent class", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    expect(() =>
      updateClass(db, {
        id: "class-does-not-exist",
        schoolYearId: "current",
        name: "X",
        subject: "X",
        grade: "6",
        room: "X",
        meetingPattern: "",
        cycleDays: [],
      }),
    ).toThrow("Class not found");
  });

  it("creates and updates a unit through the planner model", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    const unitId = createUnit(db, {
      classId: "grade-6-math",
      color: "blue",
      endDate: "2026-12-04",
      outcomeIds: ["sk-grade-6-mathematics-p6-1"],
      startDate: "2026-11-16",
      title: "Patterns and Graphs",
    });

    updateUnit(db, {
      classId: "grade-6-math",
      color: "violet",
      endDate: "2026-12-11",
      id: unitId,
      outcomeIds: ["sk-grade-6-mathematics-p6-1", "sk-grade-6-mathematics-p6-2"],
      startDate: "2026-11-17",
      title: "Patterns, Tables, and Graphs",
    });

    const unit = getUnitById(db, unitId);

    expect(unit).toMatchObject({
      classId: "grade-6-math",
      color: "violet",
      endDate: "2026-12-11",
      startDate: "2026-11-17",
      title: "Patterns, Tables, and Graphs",
    });
    expect(unit?.outcomeIds).toEqual([
      "sk-grade-6-mathematics-p6-1",
      "sk-grade-6-mathematics-p6-2",
    ]);
  });

  it("patches only a unit's dates, leaving other fields untouched", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());

    seedPlannerData(db, plannerData);
    const unitId = createUnit(db, {
      classId: "grade-6-math",
      color: "blue",
      endDate: "2026-12-04",
      outcomeIds: ["sk-grade-6-mathematics-p6-1"],
      startDate: "2026-11-16",
      title: "Patterns and Graphs",
    });

    updateUnitDates(db, { endDate: "2026-12-08", id: unitId, startDate: "2026-11-20" });

    const unit = getUnitById(db, unitId);

    expect(unit).toMatchObject({
      color: "blue",
      endDate: "2026-12-08",
      startDate: "2026-11-20",
      title: "Patterns and Graphs",
    });
  });

  it("throws when patching dates on a unit that doesn't exist", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    expect(() =>
      updateUnitDates(db, {
        endDate: "2026-12-08",
        id: "unit-does-not-exist",
        startDate: "2026-11-20",
      }),
    ).toThrow("Unit not found");
  });

  it("cascades a lesson date shift across the rest of the unit", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    // 2026-09-07 is Labour Day (blocked); instructional days run
    // ...09-04, 09-08, 09-09, 09-10, 09-11, 09-14, 09-15...
    const unitId = createUnitWithLessons(db, {
      unit: {
        classId: "grade-6-math",
        color: "blue",
        endDate: "2026-09-14",
        outcomeIds: [],
        startDate: "2026-09-08",
        title: "Cascade Test Unit",
      },
      lessons: [
        { title: "Lesson 1", date: "2026-09-08", durationMinutes: 45, outcomeIds: [], status: "planned", summary: "Day 1" },
        { title: "Lesson 2", date: "2026-09-09", durationMinutes: 45, outcomeIds: [], status: "planned", summary: "Day 2" },
        { title: "Lesson 3", date: "2026-09-10", durationMinutes: 45, outcomeIds: [], status: "planned", summary: "Day 3" },
      ],
    });

    const before = getUnitById(db, unitId)!;
    const day1 = before.lessons.find((lesson) => lesson.summary === "Day 1")!;
    const day2 = before.lessons.find((lesson) => lesson.summary === "Day 2")!;
    const day3 = before.lessons.find((lesson) => lesson.summary === "Day 3")!;

    const result = cascadeRescheduleUnitLessons(db, {
      unitId,
      fromDate: "2026-09-09",
      shiftByDays: 2,
    });

    expect(result.shiftedLessonIds.sort()).toEqual([day2.id, day3.id].sort());

    const after = getUnitById(db, unitId)!;
    expect(after.lessons.find((lesson) => lesson.id === day1.id)?.date).toBe("2026-09-08");
    expect(after.lessons.find((lesson) => lesson.id === day2.id)?.date).toBe("2026-09-11");
    expect(after.lessons.find((lesson) => lesson.id === day3.id)?.date).toBe("2026-09-14");
  });

  it("throws when cascading a nonexistent unit", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    expect(() =>
      cascadeRescheduleUnitLessons(db, {
        unitId: "unit-does-not-exist",
        fromDate: "2026-09-09",
        shiftByDays: 1,
      }),
    ).toThrow("Unit not found");
  });

  it("cascades by the class's actual cycle-day meeting dates, not every instructional day", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    // Seed school year: cycleLength 5, 2026-09-07 blocked (Labour Day,
    // advances). Day 3 lands on 09-03, 09-10, 09-17 — skipping 09-04,
    // 09-08, 09-09, 09-11, 09-14, 09-15, 09-16, which a plain
    // "every instructional day" shift would have landed on instead.
    const classId = createClass(db, {
      schoolYearId: "current",
      name: "French (Day 3 only)",
      subject: "French",
      grade: "6",
      room: "",
      meetingPattern: "",
      cycleDays: [3],
    });

    const unitId = createUnitWithLessons(db, {
      unit: {
        classId,
        color: "blue",
        endDate: "2026-09-20",
        outcomeIds: [],
        startDate: "2026-09-01",
        title: "Cycle Cascade Test Unit",
      },
      lessons: [
        { title: "First", date: "2026-09-03", durationMinutes: 30, outcomeIds: [], status: "planned", summary: "" },
        { title: "Second", date: "2026-09-10", durationMinutes: 30, outcomeIds: [], status: "planned", summary: "" },
      ],
    });

    const before = getUnitById(db, unitId)!;
    const first = before.lessons.find((lesson) => lesson.title === "First")!;
    const second = before.lessons.find((lesson) => lesson.title === "Second")!;

    cascadeRescheduleUnitLessons(db, {
      unitId,
      fromDate: "2026-09-03",
      shiftByDays: 1,
    });

    const after = getUnitById(db, unitId)!;
    expect(after.lessons.find((lesson) => lesson.id === first.id)?.date).toBe("2026-09-10");
    expect(after.lessons.find((lesson) => lesson.id === second.id)?.date).toBe("2026-09-17");
  });

  it("duplicates a lesson onto the class's next meeting date, linked back to the source", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    const unitId = createUnit(db, {
      classId: "grade-6-math",
      color: "blue",
      endDate: "2026-09-14",
      outcomeIds: [],
      startDate: "2026-09-08",
      title: "Extend Test Unit",
    });
    const sourceId = createLesson(db, {
      date: "2026-09-08",
      durationMinutes: 45,
      outcomeIds: [],
      status: "planned",
      summary: "Original content.",
      title: "Fractions Intro",
      unitId,
    });

    const result = duplicateLessonAsContinuation(db, sourceId);

    // grade-6-math has no cycle restriction, so "next meeting date" is just
    // the next instructional day after 2026-09-08.
    expect(result.date).toBe("2026-09-09");

    const continuation = getLessonById(db, result.lessonId)!;
    expect(continuation.title).toBe("Fractions Intro (cont'd)");
    expect(continuation.date).toBe("2026-09-09");
    expect(continuation.summary).toBe("Original content.");
    expect(continuation.continuesFromLessonId).toBe(sourceId);

    // The original lesson is untouched and doesn't carry a continuation link.
    const source = getLessonById(db, sourceId)!;
    expect(source.date).toBe("2026-09-08");
    expect(source.continuesFromLessonId).toBeUndefined();
  });

  it("duplicates onto the next cycle-day meeting date for a restricted class", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    const classId = createClass(db, {
      schoolYearId: "current",
      name: "French (Day 3 only)",
      subject: "French",
      grade: "6",
      room: "",
      meetingPattern: "",
      cycleDays: [3],
    });
    const unitId = createUnit(db, {
      classId,
      color: "blue",
      endDate: "2026-09-20",
      outcomeIds: [],
      startDate: "2026-09-01",
      title: "French Extend Test Unit",
    });
    const sourceId = createLesson(db, {
      date: "2026-09-03",
      durationMinutes: 30,
      outcomeIds: [],
      status: "planned",
      summary: "",
      title: "Greetings",
      unitId,
    });

    const result = duplicateLessonAsContinuation(db, sourceId);

    // Day 3 for this school year lands on 09-03, 09-10, 09-17 (see the
    // cascade test above) — the continuation must skip straight to 09-10,
    // not just the next calendar/instructional day.
    expect(result.date).toBe("2026-09-10");
  });

  it("throws when the class has no more meeting days left in the school year", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    const unitId = createUnit(db, {
      classId: "grade-6-math",
      color: "blue",
      endDate: "2026-12-18",
      outcomeIds: [],
      startDate: "2026-12-18",
      title: "End of Year Unit",
    });
    // 2026-12-18 is the seeded school year's last instructional day.
    const sourceId = createLesson(db, {
      date: "2026-12-18",
      durationMinutes: 45,
      outcomeIds: [],
      status: "planned",
      summary: "",
      title: "Last Lesson",
      unitId,
    });

    expect(() => duplicateLessonAsContinuation(db, sourceId)).toThrow(
      "no more meeting days left",
    );
  });

  it("creates a second school year and switches the active one", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    expect(getActiveSchoolYearId(db)).toBe("current");

    const nextYearId = createSchoolYear(db, {
      title: "2027-2028 Grade 6 Homeroom",
      startDate: "2027-09-01",
      endDate: "2027-12-17",
      cycleLength: 5,
    });

    // Creating a new year doesn't switch to it automatically.
    expect(getActiveSchoolYearId(db)).toBe("current");
    expect(getSchoolYear(db).id).toBe("current");

    setActiveSchoolYear(db, nextYearId);

    expect(getActiveSchoolYearId(db)).toBe(nextYearId);
    expect(getSchoolYear(db).title).toBe("2027-2028 Grade 6 Homeroom");
  });

  it("lists school years newest-first", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    createSchoolYear(db, {
      title: "2027-2028",
      startDate: "2027-09-01",
      endDate: "2027-12-17",
      cycleLength: 5,
    });

    const years = listSchoolYears(db);

    expect(years.map((year) => year.title)).toEqual(["2027-2028", plannerData.schoolYear.title]);
  });

  it("throws when switching to a nonexistent school year", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    expect(() => setActiveSchoolYear(db, "year-does-not-exist")).toThrow(
      "School year not found",
    );
  });

  it("throws when looking up a nonexistent school year by id", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    expect(() => getSchoolYearById(db, "year-does-not-exist")).toThrow(
      "School year not found",
    );
  });

  it("refuses to delete the active school year", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    expect(() => deleteSchoolYear(db, "current")).toThrow(
      "Can't delete the active school year",
    );
  });

  it("deletes a non-active school year and cascades its classes", () => {
    const db = createClassPilotDatabase(temporaryDatabasePath());
    seedPlannerData(db, plannerData);

    const nextYearId = createSchoolYear(db, {
      title: "2027-2028",
      startDate: "2027-09-01",
      endDate: "2027-12-17",
      cycleLength: 5,
    });
    const classId = createClass(db, {
      schoolYearId: nextYearId,
      name: "French",
      subject: "French",
      grade: "6",
      room: "",
      meetingPattern: "",
      cycleDays: [],
    });

    deleteSchoolYear(db, nextYearId);

    expect(() => getSchoolYearById(db, nextYearId)).toThrow("School year not found");
    expect(getClassById(db, classId)).toBeUndefined();
  });
});
