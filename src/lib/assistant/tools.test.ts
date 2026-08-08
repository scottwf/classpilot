// @vitest-environment node
//
// Vitest's default environment (jsdom, set globally in vitest.config.ts) is a
// browser-like sandbox that can't bundle the Node-only `node:sqlite` module
// this file (transitively) imports. Force the real Node environment here.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createClassPilotDatabase } from "@/src/lib/db/sqlite";
import { getPlannerData, seedPlannerData } from "@/src/lib/db/planner-repository";
import { getStudentProfile, listRoster } from "@/src/lib/db/students-repository";
import { plannerData } from "@/src/features/planner/seed-data";
import { findTool } from "./tools";

function seededDb() {
  const path = join(mkdtempSync(join(tmpdir(), "classpilot-test-")), "test.sqlite");
  const db = createClassPilotDatabase(path);
  seedPlannerData(db, plannerData);
  return db;
}

function tool(name: string) {
  const found = findTool(name);
  if (!found) throw new Error(`Tool not registered: ${name}`);
  return found;
}

describe("list_classes", () => {
  it("lists the seeded classes", async () => {
    const db = seededDb();
    const result = await tool("list_classes").execute(db, {});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const classes = result.data as Array<{ name: string; subject: string }>;
    expect(classes.some((c) => c.name === "Grade 6 Science" && c.subject === "Science")).toBe(true);
  });

  it("is not flagged as touching student data", () => {
    expect(tool("list_classes").touchesStudentData).toBe(false);
  });
});

describe("create_class", () => {
  it("creates a class and it shows up in list_classes", async () => {
    const db = seededDb();
    const created = await tool("create_class").execute(db, {
      name: "Grade 6 French",
      subject: "French",
      grade: "6",
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { classId } = created.data as { classId: string };
    expect(classId).toMatch(/^class-/);

    const planner = getPlannerData(db);
    expect(planner.classes.some((section) => section.id === classId)).toBe(true);
  });

  it("fails without required fields", async () => {
    const db = seededDb();
    const result = await tool("create_class").execute(db, { name: "Missing subject/grade" });

    expect(result.ok).toBe(false);
  });

  it("accepts combinedGrades for a split class", async () => {
    const db = seededDb();
    const created = await tool("create_class").execute(db, {
      name: "Grade 5/6 Split Math",
      subject: "Mathematics",
      grade: "6",
      combinedGrades: ["5"],
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { classId } = created.data as { classId: string };
    const planner = getPlannerData(db);
    const section = planner.classes.find((candidate) => candidate.id === classId);
    expect(section?.combinedGrades).toEqual(["5"]);
  });
});

describe("set_class_schedule", () => {
  it("sets a class's schedule slots", async () => {
    const db = seededDb();
    const result = await tool("set_class_schedule").execute(db, {
      classId: "grade-6-ela",
      slots: [{ cycleDay: 1, startTime: "09:00", endTime: "09:50" }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({ success: true });
  });

  it("fails without slots", async () => {
    const db = seededDb();
    const result = await tool("set_class_schedule").execute(db, { classId: "grade-6-ela", slots: [] });

    expect(result.ok).toBe(false);
  });
});

describe("create_unit", () => {
  it("computes an end date from lessonDayCount using the class's real meeting days", async () => {
    const db = seededDb();
    const result = await tool("create_unit").execute(db, {
      classId: "grade-6-science",
      title: "Diversity of Life",
      startDate: "2026-09-01",
      lessonDayCount: 3,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { unitId, endDate } = result.data as { unitId: string; endDate: string };
    expect(unitId).toMatch(/^unit-/);
    // 2026-09-01 is a Tuesday: 09-01, 09-02, 09-03 are the first three
    // weekday instructional days with no blocked dates in between.
    expect(endDate).toBe("2026-09-03");
  });

  it("attaches every outcome for the class's subject/grade when includeAllClassOutcomes is set", async () => {
    const db = seededDb();
    const planner = getPlannerData(db);
    const scienceOutcomeCount = planner.outcomes.filter(
      (outcome) => outcome.subject === "Science" && outcome.grade === "6",
    ).length;
    expect(scienceOutcomeCount).toBeGreaterThan(0);

    const result = await tool("create_unit").execute(db, {
      classId: "grade-6-science",
      title: "Diversity of Life",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      includeAllClassOutcomes: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.data as { outcomeCount: number }).outcomeCount).toBe(scienceOutcomeCount);
  });

  it("fails for an unknown class", async () => {
    const db = seededDb();
    const result = await tool("create_unit").execute(db, {
      classId: "class-does-not-exist",
      title: "X",
      startDate: "2026-09-01",
      endDate: "2026-09-10",
    });

    expect(result.ok).toBe(false);
  });

  it("fails without either endDate or lessonDayCount", async () => {
    const db = seededDb();
    const result = await tool("create_unit").execute(db, {
      classId: "grade-6-science",
      title: "X",
      startDate: "2026-09-01",
    });

    expect(result.ok).toBe(false);
  });
});

describe("create_lesson", () => {
  it("adds a lesson to an existing unit", async () => {
    const db = seededDb();
    const unitResult = await tool("create_unit").execute(db, {
      classId: "grade-6-science",
      title: "Diversity of Life",
      startDate: "2026-09-01",
      lessonDayCount: 3,
    });
    expect(unitResult.ok).toBe(true);
    if (!unitResult.ok) return;
    const { unitId } = unitResult.data as { unitId: string };

    const lessonResult = await tool("create_lesson").execute(db, {
      unitId,
      title: "What is biodiversity?",
      date: "2026-09-01",
    });

    expect(lessonResult.ok).toBe(true);
    if (!lessonResult.ok) return;
    expect((lessonResult.data as { lessonId: string }).lessonId).toMatch(/^lesson-/);
  });

  it("fails for an unknown unit", async () => {
    const db = seededDb();
    const result = await tool("create_lesson").execute(db, {
      unitId: "unit-does-not-exist",
      title: "X",
      date: "2026-09-01",
    });

    expect(result.ok).toBe(false);
  });
});

describe("draft_unit_outline and draft_lesson_sections", () => {
  it("fail with a not-configured error when no AI provider is set", async () => {
    const db = seededDb();

    const unitResult = await tool("draft_unit_outline").execute(db, {
      classId: "grade-6-science",
      unitFocus: "Diversity of life",
    });
    expect(unitResult.ok).toBe(false);

    const lessonResult = await tool("draft_lesson_sections").execute(db, {
      classId: "grade-6-science",
      lessonTitle: "What is biodiversity?",
    });
    expect(lessonResult.ok).toBe(false);
  });

  it("are flagged as content generation, not student data", () => {
    expect(tool("draft_unit_outline")).toMatchObject({
      contentGeneration: true,
      touchesStudentData: false,
    });
    expect(tool("draft_lesson_sections")).toMatchObject({
      contentGeneration: true,
      touchesStudentData: false,
    });
  });
});

describe("student-data tools", () => {
  it("create_student and list_students round-trip", async () => {
    const db = seededDb();
    const created = await tool("create_student").execute(db, {
      firstName: "Jamie",
      lastName: "Rivera",
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { studentId } = created.data as { studentId: string };

    const roster = listRoster(db);
    expect(roster.some((student) => student.id === studentId)).toBe(true);
  });

  it("create_student_note attaches a note to the student's profile", async () => {
    const db = seededDb();
    const created = await tool("create_student").execute(db, {
      firstName: "Jamie",
      lastName: "Rivera",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { studentId } = created.data as { studentId: string };

    const noteResult = await tool("create_student_note").execute(db, {
      studentId,
      date: "2026-09-05",
      category: "academic",
      body: "Making strong progress on fractions.",
    });

    expect(noteResult.ok).toBe(true);

    const profile = getStudentProfile(db, studentId);
    expect(profile?.notes).toHaveLength(1);
    expect(profile?.notes[0].body).toBe("Making strong progress on fractions.");
  });

  it("fails create_student_note for an unknown student", async () => {
    const db = seededDb();
    const result = await tool("create_student_note").execute(db, {
      studentId: "student-does-not-exist",
      date: "2026-09-05",
      body: "Note",
    });

    expect(result.ok).toBe(false);
  });

  it("every student-data tool is flagged touchesStudentData", () => {
    for (const name of [
      "list_students",
      "get_student_profile",
      "create_student",
      "create_student_note",
    ]) {
      expect(tool(name).touchesStudentData).toBe(true);
    }
  });
});
