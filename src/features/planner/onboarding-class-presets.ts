import type { GradeSubjects } from "./curriculum-subjects";
import type { ClassSection } from "./types";

export type OnboardingClassPreset = {
  grade: string;
  isInstructional: boolean;
  key: string;
  name: string;
  subject: string;
};

type EncodedPresetSelection =
  | { kind: "instructional"; grade: string; subject: string }
  | { kind: "nonInstructional"; name: string };

const shortSubjectNames: Record<string, string> = {
  "Arts Education": "Arts Ed",
  "Career Education": "Career Ed",
  "English Language Arts": "ELA",
  "Health Education": "Health",
  Mathematics: "Math",
  "Physical Education": "Phys Ed",
};

export const nonInstructionalPresetNames = [
  "Prep",
  "Supervision",
  "Staff Meetings",
] as const;

export function shortSubjectName(subject: string): string {
  return shortSubjectNames[subject] ?? subject;
}

export function buildInstructionalClassPreset(
  grade: string,
  subject: string,
): OnboardingClassPreset {
  return {
    grade,
    isInstructional: true,
    key: `instructional:${grade}:${subject}`,
    name: `${shortSubjectName(subject)} ${grade}`,
    subject,
  };
}

export function buildInstructionalClassPresets(
  gradeSubjects: GradeSubjects[],
): OnboardingClassPreset[] {
  return gradeSubjects.flatMap((entry) =>
    entry.subjects.map((subject) =>
      buildInstructionalClassPreset(entry.grade, subject),
    ),
  );
}

export function buildNonInstructionalClassPresets(): OnboardingClassPreset[] {
  return nonInstructionalPresetNames.map((name) => ({
    grade: "",
    isInstructional: false,
    key: `non-instructional:${normalize(name)}`,
    name,
    subject: name,
  }));
}

export function isClassPresetAlreadyAdded(
  preset: OnboardingClassPreset,
  existingClasses: ClassSection[],
): boolean {
  if (preset.isInstructional) {
    return existingClasses.some(
      (classSection) =>
        classSection.isInstructional &&
        classSection.grade === preset.grade &&
        classSection.subject === preset.subject,
    );
  }

  const canonicalName = normalize(preset.name);
  return existingClasses.some(
    (classSection) =>
      !classSection.isInstructional &&
      (normalize(classSection.name) === canonicalName ||
        normalize(classSection.subject) === canonicalName),
  );
}

export function encodeClassPresetSelection(
  preset: OnboardingClassPreset,
): string {
  const selection: EncodedPresetSelection = preset.isInstructional
    ? {
        kind: "instructional",
        grade: preset.grade,
        subject: preset.subject,
      }
    : { kind: "nonInstructional", name: preset.name };

  return JSON.stringify(selection);
}

/**
 * Validates browser-submitted selections against the curriculum currently
 * loaded in the database and the fixed schedule-block allow-list.
 */
export function parseClassPresetSelections(
  values: string[],
  gradeSubjects: GradeSubjects[],
): OnboardingClassPreset[] | undefined {
  const allowedInstructional = new Set(
    gradeSubjects.flatMap((entry) =>
      entry.subjects.map((subject) => `${entry.grade}\u0000${subject}`),
    ),
  );
  const allowedNonInstructional = new Set<string>(
    nonInstructionalPresetNames,
  );
  const presets = new Map<string, OnboardingClassPreset>();

  for (const value of values) {
    let selection: unknown;
    try {
      selection = JSON.parse(value);
    } catch {
      return undefined;
    }

    if (!isEncodedPresetSelection(selection)) {
      return undefined;
    }

    let preset: OnboardingClassPreset;
    if (selection.kind === "instructional") {
      if (
        !allowedInstructional.has(
          `${selection.grade}\u0000${selection.subject}`,
        )
      ) {
        return undefined;
      }
      preset = buildInstructionalClassPreset(
        selection.grade,
        selection.subject,
      );
    } else {
      if (!allowedNonInstructional.has(selection.name)) {
        return undefined;
      }
      preset = buildNonInstructionalClassPresets().find(
        (candidate) => candidate.name === selection.name,
      )!;
    }

    presets.set(preset.key, preset);
  }

  return Array.from(presets.values());
}

function isEncodedPresetSelection(
  value: unknown,
): value is EncodedPresetSelection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const selection = value as Record<string, unknown>;
  if (selection.kind === "instructional") {
    return (
      typeof selection.grade === "string" &&
      selection.grade.length > 0 &&
      typeof selection.subject === "string" &&
      selection.subject.length > 0
    );
  }

  return (
    selection.kind === "nonInstructional" &&
    typeof selection.name === "string" &&
    selection.name.length > 0
  );
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}
