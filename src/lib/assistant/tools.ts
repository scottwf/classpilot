import {
  createClass,
  createLesson,
  createUnit,
  getActiveSchoolYearId,
  getPlannerData,
  getUnitById,
} from "@/src/lib/db/planner-repository";
import { setClassSchedule } from "@/src/lib/db/schedule-repository";
import type { ClassPilotDatabase } from "@/src/lib/db/sqlite";
import {
  createNote,
  createStudent,
  getStudentProfile,
  listRoster,
} from "@/src/lib/db/students-repository";
import { computeUnitEndDate, findOverlappingUnitIds } from "@/src/features/planner/unit-pacing";
import type { ClassColor } from "@/src/features/planner/types";
import { generateUnitOutline } from "@/src/lib/ai/unit-outline";
import { generateLessonSections } from "@/src/lib/ai/lesson-draft";
import { generateLessonResource } from "@/src/lib/ai/lesson-resource";
import { saveUnitOutlineDraft } from "@/src/lib/ai/save-unit-outline";
import { AiError, type UnitOutlineDraft } from "@/src/lib/ai/types";

/** Plain JSON Schema, hand-written rather than pulled from a validation
 * library — the tool set is small and stable enough that a schema
 * generator would be more machinery than it's worth. */
type JsonSchema = Record<string, unknown>;

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export type AssistantTool = {
  name: string;
  description: string;
  parameters: JsonSchema;
  /** True when this tool reads or writes student records — only ever
   * offered to the local model (see chat orchestration), so student data
   * never reaches a hosted API. */
  touchesStudentData: boolean;
  /** True when this tool makes its own scoped call to the hosted AI
   * provider internally (unit outlines, lesson sections) — the tool's
   * inputs/outputs still only carry curriculum/timing context, never
   * student data, matching the existing drafting functions' guarantee. */
  contentGeneration: boolean;
  execute: (
    db: ClassPilotDatabase,
    userId: string,
    args: Record<string, unknown>,
  ) => Promise<ToolResult>;
};

const classColors: ClassColor[] = [
  "blue",
  "emerald",
  "amber",
  "rose",
  "violet",
  "sky",
  "orange",
  "teal",
];

function ok(data: unknown): ToolResult {
  return { ok: true, data };
}

function fail(error: string): ToolResult {
  return { ok: false, error };
}

function str(args: Record<string, unknown>, key: string): string {
  return typeof args[key] === "string" ? (args[key] as string).trim() : "";
}

function num(args: Record<string, unknown>, key: string): number | undefined {
  return typeof args[key] === "number" && Number.isFinite(args[key]) ? (args[key] as number) : undefined;
}

function strArray(args: Record<string, unknown>, key: string): string[] {
  return Array.isArray(args[key]) ? (args[key] as unknown[]).map(String) : [];
}

const listClassesTool: AssistantTool = {
  contentGeneration: false,
  description:
    "Lists every class (subject row) in the active school year — id, name, subject, grade, combined grades, color, and which cycle days it meets on. Call this first when you need a classId.",
  execute: async (db, userId) => {
    const planner = getPlannerData(db, userId);
    return ok(
      planner.classes.map((section) => ({
        classId: section.id,
        color: section.color,
        combinedGrades: section.combinedGrades ?? [],
        cycleDays: section.cycleDays,
        grade: section.grade,
        isInstructional: section.isInstructional,
        name: section.name,
        subject: section.subject,
      })),
    );
  },
  name: "list_classes",
  parameters: { properties: {}, type: "object" },
  touchesStudentData: false,
};

const createClassTool: AssistantTool = {
  contentGeneration: false,
  description:
    "Creates a new class (a row on the unit timeline). Grade and subject should match curriculum outcomes already loaded — call list_outcome_subjects if unsure what's available. Returns the new classId.",
  execute: async (db, userId, args) => {
    const name = str(args, "name");
    const subject = str(args, "subject");
    const grade = str(args, "grade");

    if (!name || !subject || !grade) {
      return fail("name, subject, and grade are required.");
    }

    const color = str(args, "color");
    const classId = createClass(db, userId, {
      color: classColors.includes(color as ClassColor) ? (color as ClassColor) : undefined,
      combinedGrades: strArray(args, "combinedGrades"),
      cycleDays: (Array.isArray(args.cycleDays) ? (args.cycleDays as unknown[]) : [])
        .map(Number)
        .filter((value) => Number.isInteger(value) && value > 0),
      grade,
      isInstructional: args.isInstructional !== false,
      meetingPattern: str(args, "meetingPattern"),
      name,
      room: str(args, "room"),
      schoolYearId: getActiveSchoolYearId(db, userId),
      subject,
      targetMinutesPerYear: num(args, "targetMinutesPerYear"),
    });

    return ok({ classId });
  },
  name: "create_class",
  parameters: {
    properties: {
      name: { type: "string" },
      subject: { type: "string" },
      grade: { type: "string" },
      combinedGrades: {
        type: "array",
        items: { type: "string" },
        description: "Other grades whose outcomes also apply, for a combined-grade split class.",
      },
      room: { type: "string" },
      meetingPattern: { type: "string", description: "Free-text label, e.g. 'Daily numeracy block'." },
      cycleDays: {
        type: "array",
        items: { type: "integer" },
        description: "Which cycle days (1..cycleLength) this class meets on. Empty/omitted means every instructional day.",
      },
      color: { type: "string", enum: classColors },
      isInstructional: { type: "boolean", description: "False for recess/supervision/assemblies. Defaults true." },
      targetMinutesPerYear: { type: "number" },
    },
    required: ["name", "subject", "grade"],
    type: "object",
  },
  touchesStudentData: false,
};

const setClassScheduleTool: AssistantTool = {
  contentGeneration: false,
  description:
    "Sets (replaces) a class's whole weekly schedule: which cycle days it meets and the start/end time each day. Call list_classes first to get the classId and the school's cycleLength/dayLabelScheme.",
  execute: async (db, userId, args) => {
    const classId = str(args, "classId");
    const slotsInput = Array.isArray(args.slots) ? (args.slots as Record<string, unknown>[]) : [];

    if (!classId || slotsInput.length === 0) {
      return fail("classId and at least one slot (cycleDay, startTime, endTime) are required.");
    }

    const slots = slotsInput.map((slot) => ({
      cycleDay: Number(slot.cycleDay),
      endTime: str(slot, "endTime"),
      startTime: str(slot, "startTime"),
    }));

    if (slots.some((slot) => !Number.isInteger(slot.cycleDay) || !slot.startTime || !slot.endTime)) {
      return fail("Each slot needs an integer cycleDay, startTime (HH:MM), and endTime (HH:MM).");
    }

    try {
      const conflicts = setClassSchedule(db, userId, classId, slots);
      return ok({ conflicts, success: true });
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not set the schedule.");
    }
  },
  name: "set_class_schedule",
  parameters: {
    properties: {
      classId: { type: "string" },
      slots: {
        type: "array",
        items: {
          properties: {
            cycleDay: { type: "integer" },
            startTime: { type: "string", description: "24-hour HH:MM" },
            endTime: { type: "string", description: "24-hour HH:MM" },
          },
          required: ["cycleDay", "startTime", "endTime"],
          type: "object",
        },
      },
    },
    required: ["classId", "slots"],
    type: "object",
  },
  touchesStudentData: false,
};

const listOutcomeSubjectsTool: AssistantTool = {
  contentGeneration: false,
  description:
    "Lists curriculum outcomes, optionally filtered by subject and/or grade — use this to find real outcomeIds before creating a unit, rather than guessing outcome codes.",
  execute: async (db, userId, args) => {
    const planner = getPlannerData(db, userId);
    const subject = str(args, "subject").toLowerCase();
    const grade = str(args, "grade");

    const outcomes = planner.outcomes.filter(
      (outcome) =>
        (!subject || outcome.subject.toLowerCase() === subject) &&
        (!grade || outcome.grade === grade),
    );

    return ok(
      outcomes.map((outcome) => ({
        outcomeId: outcome.id,
        code: outcome.code,
        description: outcome.description,
        subject: outcome.subject,
        grade: outcome.grade,
      })),
    );
  },
  name: "list_outcomes",
  parameters: {
    properties: {
      subject: { type: "string" },
      grade: { type: "string" },
    },
    type: "object",
  },
  touchesStudentData: false,
};

const listUnitsTool: AssistantTool = {
  contentGeneration: false,
  description: "Lists units, optionally filtered to one class — id, title, dates, and lesson count.",
  execute: async (db, userId, args) => {
    const planner = getPlannerData(db, userId);
    const classId = str(args, "classId");
    const units = classId ? planner.units.filter((unit) => unit.classId === classId) : planner.units;

    return ok(
      units.map((unit) => ({
        unitId: unit.id,
        classId: unit.classId,
        endDate: unit.endDate,
        lessonCount: unit.lessons.length,
        startDate: unit.startDate,
        title: unit.title,
      })),
    );
  },
  name: "list_units",
  parameters: { properties: { classId: { type: "string" } }, type: "object" },
  touchesStudentData: false,
};

const createUnitTool: AssistantTool = {
  contentGeneration: false,
  description:
    "Creates a unit for a class with no AI-drafted content — just the title, dates, and outcomes. Its color is always a shade of the class's color, not something to choose. Give either endDate directly, or lessonDayCount to compute the end date from the class's real meeting days. Use includeAllClassOutcomes to attach every outcome for the class's subject/grade(s) instead of listing outcomeIds by hand.",
  execute: async (db, userId, args) => {
    const classId = str(args, "classId");
    const title = str(args, "title");
    const startDate = str(args, "startDate");

    if (!classId || !title || !startDate) {
      return fail("classId, title, and startDate are required.");
    }

    const planner = getPlannerData(db, userId);
    const classSection = planner.classes.find((section) => section.id === classId);

    if (!classSection) {
      return fail(`No class found with id ${classId}.`);
    }

    let endDate = str(args, "endDate");
    const lessonDayCount = num(args, "lessonDayCount");

    if (!endDate && lessonDayCount) {
      endDate = computeUnitEndDate(planner.schoolYear, classSection, startDate, lessonDayCount).endDate;
    }

    if (!endDate) {
      return fail("Provide either endDate or lessonDayCount.");
    }

    const classGrades = [classSection.grade, ...(classSection.combinedGrades ?? [])];
    const explicitOutcomeIds = strArray(args, "outcomeIds");
    const outcomeIds =
      args.includeAllClassOutcomes === true
        ? planner.outcomes
            .filter(
              (outcome) =>
                outcome.subject === classSection.subject && classGrades.includes(outcome.grade),
            )
            .map((outcome) => outcome.id)
        : explicitOutcomeIds;

    const otherUnits = planner.units
      .filter((unit) => unit.classId === classId)
      .map((unit) => ({ classId: unit.classId, endDate: unit.endDate, id: unit.id, startDate: unit.startDate }));
    const overlapsExistingUnit = findOverlappingUnitIds([
      ...otherUnits,
      { classId, endDate, id: "__new__", startDate },
    ]).has("__new__");

    const unitId = createUnit(db, userId, {
      classId,
      endDate,
      outcomeIds,
      startDate,
      title,
    });

    return ok({
      endDate,
      outcomeCount: outcomeIds.length,
      overlapsExistingUnit,
      overlapWarning: overlapsExistingUnit
        ? "This unit's dates overlap another unit already on this class — mention this to the teacher."
        : undefined,
      unitId,
    });
  },
  name: "create_unit",
  parameters: {
    properties: {
      classId: { type: "string" },
      title: { type: "string" },
      startDate: { type: "string", description: "YYYY-MM-DD" },
      endDate: { type: "string", description: "YYYY-MM-DD — omit if using lessonDayCount instead." },
      lessonDayCount: {
        type: "integer",
        description: "Number of the class's actual meeting days this unit should span — used to compute endDate.",
      },
      outcomeIds: { type: "array", items: { type: "string" } },
      includeAllClassOutcomes: {
        type: "boolean",
        description: "Attach every outcome matching the class's subject/grade(s) instead of listing outcomeIds.",
      },
    },
    required: ["classId", "title", "startDate"],
    type: "object",
  },
  touchesStudentData: false,
};

const createLessonTool: AssistantTool = {
  contentGeneration: false,
  description: "Adds one lesson to an existing unit — no AI drafting, just the fields given.",
  execute: async (db, userId, args) => {
    const unitId = str(args, "unitId");
    const title = str(args, "title");
    const date = str(args, "date");
    const durationMinutes = num(args, "durationMinutes") ?? 45;

    if (!unitId || !title || !date) {
      return fail("unitId, title, and date are required.");
    }

    if (!getUnitById(db, userId, unitId)) {
      return fail(`No unit found with id ${unitId}.`);
    }

    const lessonId = createLesson(db, userId, {
      date,
      durationMinutes,
      outcomeIds: strArray(args, "outcomeIds"),
      status: "planned",
      summary: str(args, "summary"),
      title,
      unitId,
    });

    return ok({ lessonId });
  },
  name: "create_lesson",
  parameters: {
    properties: {
      unitId: { type: "string" },
      title: { type: "string" },
      date: { type: "string", description: "YYYY-MM-DD" },
      durationMinutes: { type: "integer" },
      summary: { type: "string" },
      outcomeIds: { type: "array", items: { type: "string" } },
    },
    required: ["unitId", "title", "date"],
    type: "object",
  },
  touchesStudentData: false,
};

const draftUnitOutlineTool: AssistantTool = {
  contentGeneration: true,
  description:
    "Drafts a full unit outline (title, big ideas, essential questions, a sequenced lesson list, assessment ideas, differentiation notes) via the hosted AI provider — does NOT save anything. Only curriculum/timing context is sent, never student data. Follow up with save_unit_from_outline to actually create it, after confirming the draft with the teacher.",
  execute: async (db, userId, args) => {
    const classId = str(args, "classId");
    const unitFocus = str(args, "unitFocus");

    if (!classId || !unitFocus) {
      return fail("classId and unitFocus are required.");
    }

    const planner = getPlannerData(db, userId);
    const classSection = planner.classes.find((section) => section.id === classId);

    if (!classSection) {
      return fail(`No class found with id ${classId}.`);
    }

    const classGrades = [classSection.grade, ...(classSection.combinedGrades ?? [])];
    const explicitOutcomeIds = new Set(strArray(args, "outcomeIds"));
    const relevantOutcomes = planner.outcomes.filter(
      (outcome) =>
        explicitOutcomeIds.has(outcome.id) ||
        (explicitOutcomeIds.size === 0 &&
          outcome.subject === classSection.subject &&
          classGrades.includes(outcome.grade)),
    );

    try {
      const draft = await generateUnitOutline({
        grade: classSection.grade,
        lessonMinutes: num(args, "lessonMinutes") ?? 45,
        lessonsPerWeek: num(args, "lessonsPerWeek") ?? 3,
        outcomes: relevantOutcomes.map((outcome) => ({
          code: outcome.code,
          description: outcome.description,
        })),
        subject: classSection.subject,
        teachingNotes: str(args, "teachingNotes"),
        unitFocus,
        weeks: num(args, "weeks") ?? 4,
      });

      return ok({ classId, draft, selectedOutcomeIds: Array.from(explicitOutcomeIds) });
    } catch (error) {
      return fail(error instanceof AiError ? error.message : "Could not draft the unit outline.");
    }
  },
  name: "draft_unit_outline",
  parameters: {
    properties: {
      classId: { type: "string" },
      unitFocus: { type: "string" },
      weeks: { type: "integer" },
      lessonsPerWeek: { type: "integer" },
      lessonMinutes: { type: "integer" },
      teachingNotes: { type: "string" },
      outcomeIds: {
        type: "array",
        items: { type: "string" },
        description: "Omit to use every outcome for the class's subject/grade(s).",
      },
    },
    required: ["classId", "unitFocus"],
    type: "object",
  },
  touchesStudentData: false,
};

const saveUnitFromOutlineTool: AssistantTool = {
  contentGeneration: false,
  description:
    "Saves a unit outline (from draft_unit_outline's output — pass its draft and selectedOutcomeIds back exactly) as a real unit with lessons scheduled across the class's instructional days starting on startDate.",
  execute: async (db, userId, args) => {
    const classId = str(args, "classId");
    const startDate = str(args, "startDate");
    const draft = args.draft as UnitOutlineDraft | undefined;

    if (!classId || !startDate || !draft || !Array.isArray(draft.lessonSequence)) {
      return fail("classId, startDate, and draft (from draft_unit_outline) are required.");
    }

    if (draft.lessonSequence.length === 0) {
      return fail("This draft has no lessons to save.");
    }

    const planner = getPlannerData(db, userId);

    if (!planner.classes.some((section) => section.id === classId)) {
      return fail(`No class found with id ${classId}.`);
    }

    try {
      const unitId = saveUnitOutlineDraft(db, userId, planner, {
        classId,
        draft,
        lessonMinutes: num(args, "lessonMinutes") ?? 45,
        lessonsPerWeek: num(args, "lessonsPerWeek") ?? 3,
        selectedOutcomeIds: strArray(args, "selectedOutcomeIds"),
        startDate,
      });

      return ok({ unitId });
    } catch {
      return fail("Could not save the unit.");
    }
  },
  name: "save_unit_from_outline",
  parameters: {
    properties: {
      classId: { type: "string" },
      startDate: { type: "string", description: "YYYY-MM-DD" },
      lessonsPerWeek: { type: "integer" },
      lessonMinutes: { type: "integer" },
      selectedOutcomeIds: { type: "array", items: { type: "string" } },
      draft: {
        type: "object",
        description: "The exact draft object returned by draft_unit_outline.",
      },
    },
    required: ["classId", "startDate", "draft"],
    type: "object",
  },
  touchesStudentData: false,
};

const draftLessonSectionsTool: AssistantTool = {
  contentGeneration: true,
  description:
    "Drafts one lesson's structured sections (learning goals, materials, minds-on, lesson flow, assessment, differentiation, resources) via the hosted AI provider — does NOT save anything. Only curriculum/timing context is sent, never student data. Follow up with create_lesson to save it (sections aren't stored by create_lesson yet — mention them back to the teacher, or use the lessons UI to paste them in).",
  execute: async (db, userId, args) => {
    const classId = str(args, "classId");
    const lessonTitle = str(args, "lessonTitle");

    if (!classId || !lessonTitle) {
      return fail("classId and lessonTitle are required.");
    }

    const planner = getPlannerData(db, userId);
    const classSection = planner.classes.find((section) => section.id === classId);

    if (!classSection) {
      return fail(`No class found with id ${classId}.`);
    }

    const classGrades = [classSection.grade, ...(classSection.combinedGrades ?? [])];
    const explicitOutcomeIds = new Set(strArray(args, "outcomeIds"));
    const relevantOutcomes = planner.outcomes.filter(
      (outcome) =>
        explicitOutcomeIds.has(outcome.id) ||
        (explicitOutcomeIds.size === 0 &&
          outcome.subject === classSection.subject &&
          classGrades.includes(outcome.grade)),
    );

    try {
      const sections = await generateLessonSections({
        grade: classSection.grade,
        lessonFocus: str(args, "lessonFocus"),
        lessonMinutes: num(args, "lessonMinutes") ?? 45,
        lessonTitle,
        outcomes: relevantOutcomes.map((outcome) => ({
          code: outcome.code,
          description: outcome.description,
        })),
        subject: classSection.subject,
        teachingNotes: str(args, "teachingNotes"),
        unitTitle: str(args, "unitTitle"),
      });

      return ok(sections);
    } catch (error) {
      return fail(error instanceof AiError ? error.message : "Could not draft the lesson sections.");
    }
  },
  name: "draft_lesson_sections",
  parameters: {
    properties: {
      classId: { type: "string" },
      unitTitle: { type: "string" },
      lessonTitle: { type: "string" },
      lessonFocus: { type: "string" },
      lessonMinutes: { type: "integer" },
      teachingNotes: { type: "string" },
      outcomeIds: { type: "array", items: { type: "string" } },
    },
    required: ["classId", "lessonTitle"],
    type: "object",
  },
  touchesStudentData: false,
};

const resourceTypes = ["handout", "exit_card", "slide_outline"] as const;

const draftLessonResourceTool: AssistantTool = {
  contentGeneration: true,
  description:
    "Drafts a printable/copyable lesson resource — a student handout, an exit card, or a slide-by-slide outline — as plain Markdown via the hosted AI provider. Does NOT save anything (there's nowhere to save a resource yet); return the Markdown to the teacher so they can copy it into the lesson or print it. Only curriculum/timing context is sent, never student data.",
  execute: async (db, userId, args) => {
    const classId = str(args, "classId");
    const lessonTitle = str(args, "lessonTitle");
    const resourceTypeArg = str(args, "resourceType");
    const resourceType = (resourceTypes as readonly string[]).includes(resourceTypeArg)
      ? (resourceTypeArg as (typeof resourceTypes)[number])
      : undefined;

    if (!classId || !lessonTitle || !resourceType) {
      return fail("classId, lessonTitle, and a valid resourceType are required.");
    }

    const planner = getPlannerData(db, userId);
    const classSection = planner.classes.find((section) => section.id === classId);

    if (!classSection) {
      return fail(`No class found with id ${classId}.`);
    }

    const classGrades = [classSection.grade, ...(classSection.combinedGrades ?? [])];
    const explicitOutcomeIds = new Set(strArray(args, "outcomeIds"));
    const relevantOutcomes = planner.outcomes.filter(
      (outcome) =>
        explicitOutcomeIds.has(outcome.id) ||
        (explicitOutcomeIds.size === 0 &&
          outcome.subject === classSection.subject &&
          classGrades.includes(outcome.grade)),
    );

    try {
      const markdown = await generateLessonResource({
        grade: classSection.grade,
        lessonFocus: str(args, "lessonFocus"),
        lessonTitle,
        outcomes: relevantOutcomes.map((outcome) => ({
          code: outcome.code,
          description: outcome.description,
        })),
        resourceType,
        subject: classSection.subject,
        teachingNotes: str(args, "teachingNotes"),
      });

      return ok({ markdown, resourceType });
    } catch (error) {
      return fail(error instanceof AiError ? error.message : "Could not draft the resource.");
    }
  },
  name: "draft_lesson_resource",
  parameters: {
    properties: {
      classId: { type: "string" },
      lessonTitle: { type: "string" },
      resourceType: { type: "string", enum: resourceTypes as unknown as string[] },
      lessonFocus: { type: "string" },
      teachingNotes: { type: "string" },
      outcomeIds: { type: "array", items: { type: "string" } },
    },
    required: ["classId", "lessonTitle", "resourceType"],
    type: "object",
  },
  touchesStudentData: false,
};

const listStudentsTool: AssistantTool = {
  contentGeneration: false,
  description: "Lists the student roster — id, name, status, and open reminder/follow-up counts.",
  execute: async (db, userId) => {
    const roster = listRoster(db, userId, getActiveSchoolYearId(db, userId));
    return ok(
      roster.map((student) => ({
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        preferredName: student.preferredName,
        status: student.status,
        openFollowUpCount: student.openFollowUpCount,
        openReminderCount: student.openReminderCount,
      })),
    );
  },
  name: "list_students",
  parameters: { properties: {}, type: "object" },
  touchesStudentData: true,
};

const getStudentProfileTool: AssistantTool = {
  contentGeneration: false,
  description:
    "Gets one student's full profile: contacts, notes, support plans, and reminders. Call list_students first to find the studentId.",
  execute: async (db, userId, args) => {
    const studentId = str(args, "studentId");

    if (!studentId) {
      return fail("studentId is required.");
    }

    const profile = getStudentProfile(db, userId, studentId);

    if (!profile) {
      return fail(`No student found with id ${studentId}.`);
    }

    return ok(profile);
  },
  name: "get_student_profile",
  parameters: { properties: { studentId: { type: "string" } }, required: ["studentId"], type: "object" },
  touchesStudentData: true,
};

const createStudentTool: AssistantTool = {
  contentGeneration: false,
  description: "Adds a new student to the active school year's roster.",
  execute: async (db, userId, args) => {
    const firstName = str(args, "firstName");
    const lastName = str(args, "lastName");

    if (!firstName || !lastName) {
      return fail("firstName and lastName are required.");
    }

    const studentId = createStudent(db, userId, {
      schoolYearId: getActiveSchoolYearId(db, userId),
      birthdate: str(args, "birthdate") || undefined,
      firstName,
      interests: str(args, "interests") || undefined,
      lastName,
      preferredName: str(args, "preferredName") || undefined,
      pronouns: str(args, "pronouns") || undefined,
      strengths: str(args, "strengths") || undefined,
    });

    return ok({ studentId });
  },
  name: "create_student",
  parameters: {
    properties: {
      firstName: { type: "string" },
      lastName: { type: "string" },
      preferredName: { type: "string" },
      pronouns: { type: "string" },
      birthdate: { type: "string", description: "YYYY-MM-DD" },
      strengths: { type: "string" },
      interests: { type: "string" },
    },
    required: ["firstName", "lastName"],
    type: "object",
  },
  touchesStudentData: true,
};

const noteCategories = [
  "academic",
  "behavior",
  "attendance",
  "social_emotional",
  "family",
  "medical",
  "other",
] as const;

const createStudentNoteTool: AssistantTool = {
  contentGeneration: false,
  description:
    "Adds a dated note to a student's record — academic progress, behavior, attendance, social-emotional, family, medical, or other. Call list_students first to find the studentId.",
  execute: async (db, userId, args) => {
    const studentId = str(args, "studentId");
    const date = str(args, "date");
    const body = str(args, "body");
    const categoryArg = str(args, "category");
    const category = (noteCategories as readonly string[]).includes(categoryArg)
      ? categoryArg
      : "other";

    if (!studentId || !date || !body) {
      return fail("studentId, date, and body are required.");
    }

    if (!getStudentProfile(db, userId, studentId)) {
      return fail(`No student found with id ${studentId}.`);
    }

    const noteId = createNote(db, userId, {
      body,
      category: category as (typeof noteCategories)[number],
      date,
      studentId,
      subject: str(args, "subject") || undefined,
    });

    return ok({ noteId });
  },
  name: "create_student_note",
  parameters: {
    properties: {
      studentId: { type: "string" },
      date: { type: "string", description: "YYYY-MM-DD" },
      category: { type: "string", enum: noteCategories as unknown as string[] },
      subject: { type: "string" },
      body: { type: "string" },
    },
    required: ["studentId", "date", "body"],
    type: "object",
  },
  touchesStudentData: true,
};

export const assistantTools: AssistantTool[] = [
  listClassesTool,
  createClassTool,
  setClassScheduleTool,
  listOutcomeSubjectsTool,
  listUnitsTool,
  createUnitTool,
  createLessonTool,
  draftUnitOutlineTool,
  saveUnitFromOutlineTool,
  draftLessonSectionsTool,
  draftLessonResourceTool,
  listStudentsTool,
  getStudentProfileTool,
  createStudentTool,
  createStudentNoteTool,
];

export function findTool(name: string): AssistantTool | undefined {
  return assistantTools.find((tool) => tool.name === name);
}
