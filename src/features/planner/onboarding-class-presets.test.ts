import { describe, expect, it } from "vitest";
import type { GradeSubjects } from "./curriculum-subjects";
import {
  buildInstructionalClassPreset,
  buildInstructionalClassPresets,
  buildNonInstructionalClassPresets,
  encodeClassPresetSelection,
  isClassPresetAlreadyAdded,
  parseClassPresetSelections,
  shortSubjectName,
} from "./onboarding-class-presets";
import type { ClassSection } from "./types";

const gradeSubjects: GradeSubjects[] = [
  { grade: "6", subjects: ["English Language Arts", "Mathematics", "Science"] },
  { grade: "7", subjects: ["Mathematics"] },
];

function classSection(
  overrides: Partial<ClassSection> = {},
): ClassSection {
  return {
    id: "class-1",
    schoolYearId: "year-1",
    name: "Math 6",
    subject: "Mathematics",
    grade: "6",
    room: "",
    meetingPattern: "",
    cycleDays: [],
    color: "blue",
    isInstructional: true,
    ...overrides,
  };
}

describe("onboarding class presets", () => {
  it("uses familiar short subject names and keeps unknown subjects intact", () => {
    expect(shortSubjectName("Mathematics")).toBe("Math");
    expect(shortSubjectName("English Language Arts")).toBe("ELA");
    expect(shortSubjectName("Arts Education")).toBe("Arts Ed");
    expect(shortSubjectName("Career Education")).toBe("Career Ed");
    expect(shortSubjectName("Health Education")).toBe("Health");
    expect(shortSubjectName("Physical Education")).toBe("Phys Ed");
    expect(shortSubjectName("Science")).toBe("Science");
  });

  it("builds a suggestion for every loaded subject in every grade", () => {
    expect(
      buildInstructionalClassPresets(gradeSubjects).map((preset) => preset.name),
    ).toEqual(["ELA 6", "Math 6", "Science 6", "Math 7"]);
  });

  it("detects instructional duplicates only for the same grade and subject", () => {
    const math6 = buildInstructionalClassPreset("6", "Mathematics");
    expect(isClassPresetAlreadyAdded(math6, [classSection()])).toBe(true);
    expect(
      isClassPresetAlreadyAdded(
        buildInstructionalClassPreset("7", "Mathematics"),
        [classSection()],
      ),
    ).toBe(false);
    expect(
      isClassPresetAlreadyAdded(math6, [
        classSection({ isInstructional: false }),
      ]),
    ).toBe(false);
  });

  it("detects non-instructional duplicates by name or subject without casing", () => {
    const [prep, supervision] = buildNonInstructionalClassPresets();
    expect(
      isClassPresetAlreadyAdded(prep, [
        classSection({
          name: "PREP",
          subject: "",
          grade: "",
          isInstructional: false,
        }),
      ]),
    ).toBe(true);
    expect(
      isClassPresetAlreadyAdded(supervision, [
        classSection({
          name: "Morning duty",
          subject: "supervision",
          grade: "",
          isInstructional: false,
        }),
      ]),
    ).toBe(true);
  });

  it("validates selections against loaded curriculum and removes duplicates", () => {
    const math = buildInstructionalClassPreset("6", "Mathematics");
    const encoded = encodeClassPresetSelection(math);

    expect(parseClassPresetSelections([encoded, encoded], gradeSubjects)).toEqual([
      math,
    ]);
    expect(
      parseClassPresetSelections(
        [
          JSON.stringify({
            kind: "instructional",
            grade: "8",
            subject: "Mathematics",
          }),
        ],
        gradeSubjects,
      ),
    ).toBeUndefined();
    expect(
      parseClassPresetSelections(
        [JSON.stringify({ kind: "nonInstructional", name: "Assembly" })],
        gradeSubjects,
      ),
    ).toBeUndefined();
    expect(parseClassPresetSelections(["not-json"], gradeSubjects)).toBeUndefined();
  });
});
