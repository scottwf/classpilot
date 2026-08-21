import { pickUnusedClassColor } from "@/src/features/planner/class-color";
import {
  isClassPresetAlreadyAdded,
  type OnboardingClassPreset,
} from "@/src/features/planner/onboarding-class-presets";
import type { ClassSection } from "@/src/features/planner/types";
import { createClass, listClassesForSchoolYear } from "./planner-repository";
import type { ClassPilotDatabase } from "./sqlite";

/** Creates onboarding presets atomically, skipping matching existing classes. */
export function createOnboardingPresetClasses(
  db: ClassPilotDatabase,
  userId: string,
  schoolYearId: string,
  presets: OnboardingClassPreset[],
): string[] {
  db.exec("BEGIN IMMEDIATE;");

  try {
    const classes = listClassesForSchoolYear(db, userId, schoolYearId);
    const createdIds: string[] = [];

    for (const preset of presets) {
      if (isClassPresetAlreadyAdded(preset, classes)) {
        continue;
      }

      const color = pickUnusedClassColor(classes);
      const id = createClass(db, userId, {
        schoolYearId,
        name: preset.name,
        subject: preset.subject,
        grade: preset.grade,
        room: "",
        meetingPattern: "",
        cycleDays: [],
        color,
        isInstructional: preset.isInstructional,
      });

      const createdClass: ClassSection = {
        id,
        schoolYearId,
        name: preset.name,
        subject: preset.subject,
        grade: preset.grade,
        room: "",
        meetingPattern: "",
        cycleDays: [],
        color,
        isInstructional: preset.isInstructional,
      };
      classes.push(createdClass);
      createdIds.push(id);
    }

    db.exec("COMMIT;");
    return createdIds;
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}
