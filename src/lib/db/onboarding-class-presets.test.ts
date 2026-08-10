// @vitest-environment node

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildInstructionalClassPreset,
  buildNonInstructionalClassPresets,
} from "@/src/features/planner/onboarding-class-presets";
import {
  createSchoolYear,
  listClassesForSchoolYear,
} from "./planner-repository";
import { createOnboardingPresetClasses } from "./onboarding-class-presets";
import { createClassPilotDatabase } from "./sqlite";

function createTestYear() {
  const path = join(
    mkdtempSync(join(tmpdir(), "classpilot-presets-test-")),
    "test.sqlite",
  );
  const db = createClassPilotDatabase(path);
  const schoolYearId = createSchoolYear(db, {
    title: "2026-2027",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    cycleLength: 6,
    blockedDates: [],
  });
  return { db, schoolYearId };
}

describe("onboarding class preset repository", () => {
  it("creates a batch with defaults and sequential unused colors", () => {
    const { db, schoolYearId } = createTestYear();
    const presets = [
      buildInstructionalClassPreset("6", "Mathematics"),
      buildInstructionalClassPreset("6", "Science"),
      buildNonInstructionalClassPresets()[0]!,
    ];

    const ids = createOnboardingPresetClasses(db, schoolYearId, presets);
    const classes = listClassesForSchoolYear(db, schoolYearId);

    expect(ids).toHaveLength(3);
    expect(classes.map((classSection) => classSection.color)).toEqual([
      "blue",
      "emerald",
      "amber",
    ]);
    expect(classes).toMatchObject([
      {
        name: "Math 6",
        subject: "Mathematics",
        grade: "6",
        room: "",
        meetingPattern: "",
        cycleDays: [],
        isInstructional: true,
      },
      {
        name: "Science 6",
        subject: "Science",
        grade: "6",
        room: "",
        meetingPattern: "",
        cycleDays: [],
        isInstructional: true,
      },
      {
        name: "Prep",
        subject: "Prep",
        grade: "",
        room: "",
        meetingPattern: "",
        cycleDays: [],
        isInstructional: false,
      },
    ]);
  });

  it("skips matching presets on a repeated submission", () => {
    const { db, schoolYearId } = createTestYear();
    const presets = [buildInstructionalClassPreset("6", "Mathematics")];

    expect(createOnboardingPresetClasses(db, schoolYearId, presets)).toHaveLength(
      1,
    );
    expect(createOnboardingPresetClasses(db, schoolYearId, presets)).toEqual([]);
    expect(listClassesForSchoolYear(db, schoolYearId)).toHaveLength(1);
  });

  it("rolls back the whole batch when one insert fails", () => {
    const { db, schoolYearId } = createTestYear();
    db.exec(`
      CREATE TRIGGER reject_science
      BEFORE INSERT ON class_sections
      WHEN NEW.subject = 'Science'
      BEGIN
        SELECT RAISE(ABORT, 'Science rejected for transaction test');
      END;
    `);

    expect(() =>
      createOnboardingPresetClasses(db, schoolYearId, [
        buildInstructionalClassPreset("6", "Mathematics"),
        buildInstructionalClassPreset("6", "Science"),
      ]),
    ).toThrow("Science rejected");
    expect(listClassesForSchoolYear(db, schoolYearId)).toEqual([]);
  });
});
