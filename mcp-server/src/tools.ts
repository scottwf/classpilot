import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getDb } from "./db.ts";
import {
  cascadeRescheduleUnitLessons,
  createClass,
  createLesson,
  createUnit,
  createUnitWithLessons,
  deleteClass,
  duplicateLessonAsContinuation,
  getActiveSchoolYearId,
  getClassById,
  getLessonById,
  getPlannerData,
  getUnitById,
  updateClass,
  updateLesson,
  updateUnit,
} from "../../src/lib/db/planner-repository.ts";
import { parseLessonMarkdown } from "../../src/lib/lessons/markdown-import.ts";
import {
  assignScheduleSlot,
  createPeriod,
  deletePeriod,
  getPeriods,
  getScheduleSlots,
  removeScheduleSlot,
  updatePeriod,
} from "../../src/lib/db/schedule-repository.ts";

const colorEnum = z
  .enum(["blue", "emerald", "amber", "rose", "violet"])
  .describe("Timeline color for the unit block.");

const statusEnum = z
  .enum(["planned", "taught", "delayed", "skipped"])
  .describe("Lesson status.");

// Every field has a "" default (rather than being optional) so the parsed
// output always matches LessonSections exactly (all fields required
// strings) — callers can still omit any field they don't have content for.
const sectionsShape = {
  learningGoals: z.string().default("").describe("Student-facing goals or success criteria."),
  materials: z.string().default("").describe("Teacher and student materials, including links."),
  mindsOn: z.string().default("").describe("Opening prompt, review, or activation task."),
  lessonFlow: z
    .string()
    .default("")
    .describe("Main sequence for instruction, practice, and consolidation."),
  assessment: z
    .string()
    .default("")
    .describe("Evidence of learning, checks for understanding, or exit task."),
  differentiation: z
    .string()
    .default("")
    .describe("Supports, extensions, accommodations, small-group notes."),
  resources: z.string().default("").describe("Images, videos, web links, and local attachment notes."),
  reflection: z.string().default("").describe("Notes after teaching."),
};

const sectionsSchema = z
  .object(sectionsShape)
  .describe(
    "Structured lesson sections. Omit fields you don't have content for; they default to empty strings.",
  );

const lessonInputShape = {
  title: z.string().min(1),
  date: z.string().describe("ISO date, e.g. 2026-09-15."),
  durationMinutes: z.number().int().positive(),
  status: statusEnum.default("planned"),
  outcomeIds: z
    .array(z.string())
    .default([])
    .describe("Curriculum outcome IDs from get_planner_data's outcomes list."),
  sections: sectionsSchema.optional(),
  summary: z.string().describe("One-line summary shown in the lesson bank list."),
};

const unitInputShape = {
  classId: z.string().describe("Class section ID from get_planner_data's classes list."),
  title: z.string().min(1),
  startDate: z.string().describe("ISO date, e.g. 2026-09-01."),
  endDate: z.string().describe("ISO date, e.g. 2026-09-30."),
  color: colorEnum,
  outcomeIds: z
    .array(z.string())
    .default([])
    .describe("Curriculum outcome IDs from get_planner_data's outcomes list."),
};

const classColorEnum = z
  .enum(["blue", "emerald", "amber", "rose", "violet", "sky", "orange", "teal"])
  .describe("Identity color for this class on the schedule grid and timetable views.");

const classInputShape = {
  name: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  room: z.string().default(""),
  meetingPattern: z.string().default("").describe("Free-text label, e.g. 'Daily numeracy block'."),
  cycleDays: z
    .array(z.number().int().positive())
    .default([])
    .describe(
      "Which of the school year's cycle days (1..cycleLength, from get_planner_data's schoolYear.cycleLength) this class meets on. Empty means every instructional day.",
    ),
  color: classColorEnum.default("blue"),
  isInstructional: z
    .boolean()
    .default(true)
    .describe(
      "False for non-instructional blocks (recess, supervision, one-off assemblies) — these skip curriculum outcomes and instructional-time tracking.",
    ),
};

function ok(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function fail(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

function normalizeRef(value: string) {
  return value.trim().toLowerCase();
}

function matchesReference(id: string, label: string, reference: string) {
  const normalized = normalizeRef(reference);
  return normalizeRef(id) === normalized || normalizeRef(label) === normalized;
}

export function registerClassPilotTools(server: McpServer) {
  server.registerTool(
    "get_planner_data",
    {
      title: "Get planner data",
      description:
        "Returns the full ClassPilot planning workspace: school year, class sections, curriculum outcomes, and every unit with its nested lessons. Call this first to find class IDs, outcome IDs, and existing unit titles before creating or updating anything.",
      inputSchema: {},
    },
    async () => {
      try {
        return ok(getPlannerData(getDb()));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "create_unit",
    {
      title: "Create unit",
      description: "Creates a new unit on the timeline. Returns the new unit's ID.",
      inputSchema: unitInputShape,
    },
    async (input) => {
      try {
        const id = createUnit(getDb(), input);
        return ok({ unitId: id });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "update_unit",
    {
      title: "Update unit",
      description:
        "Updates an existing unit's fields. All fields are required and replace the current values (not a partial patch) — call get_planner_data first to see the current values.",
      inputSchema: {
        id: z.string().describe("Unit ID to update."),
        ...unitInputShape,
      },
    },
    async (input) => {
      try {
        updateUnit(getDb(), input);
        return ok({ success: true });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "create_class",
    {
      title: "Create class",
      description:
        "Creates a new class (a row on the unit timeline). Returns the new class's ID.",
      inputSchema: classInputShape,
    },
    async (input) => {
      try {
        const db = getDb();
        const id = createClass(db, { ...input, schoolYearId: getActiveSchoolYearId(db) });
        return ok({ classId: id });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "update_class",
    {
      title: "Update class",
      description:
        "Updates an existing class's fields, including its cycle-day membership. All fields are required and replace the current values — call get_planner_data first to see the current values.",
      inputSchema: {
        id: z.string().describe("Class ID to update."),
        ...classInputShape,
      },
    },
    async (input) => {
      try {
        const db = getDb();
        const existing = getClassById(db, input.id);
        if (!existing) {
          return fail(`Class not found: ${input.id}`);
        }
        updateClass(db, { ...input, schoolYearId: existing.schoolYearId });
        return ok({ success: true });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "delete_class",
    {
      title: "Delete class",
      description:
        "Deletes a class and, by cascade, every unit and lesson under it. This cannot be undone — confirm with the user before calling this unless they've clearly already decided.",
      inputSchema: {
        id: z.string().describe("Class ID to delete."),
      },
    },
    async ({ id }) => {
      try {
        deleteClass(getDb(), id);
        return ok({ success: true });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_schedule",
    {
      title: "Get bell schedule",
      description:
        "Returns the school's periods (the bell schedule — same times every cycle day) and every schedule slot (which class occupies which period on which cycle day). Call this before assigning or removing a slot.",
      inputSchema: {},
    },
    async () => {
      try {
        const db = getDb();
        const schoolYearId = getActiveSchoolYearId(db);
        return ok({
          periods: getPeriods(db, schoolYearId),
          scheduleSlots: getScheduleSlots(db, schoolYearId),
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "create_period",
    {
      title: "Create period",
      description:
        "Adds a period to the bell schedule (e.g. 'Period 2', 08:40-09:43). Times are the same every cycle day. Returns the new period's ID.",
      inputSchema: {
        label: z.string().min(1),
        startTime: z.string().describe("24-hour \"HH:MM\", e.g. 08:40."),
        endTime: z.string().describe("24-hour \"HH:MM\", e.g. 09:43."),
        sortOrder: z.number().int().describe("Display order, lowest first."),
      },
    },
    async (input) => {
      try {
        const db = getDb();
        const id = createPeriod(db, { ...input, schoolYearId: getActiveSchoolYearId(db) });
        return ok({ periodId: id });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "update_period",
    {
      title: "Update period",
      description: "Updates an existing period's label, times, or sort order.",
      inputSchema: {
        id: z.string().describe("Period ID to update."),
        label: z.string().min(1),
        startTime: z.string().describe("24-hour \"HH:MM\", e.g. 08:40."),
        endTime: z.string().describe("24-hour \"HH:MM\", e.g. 09:43."),
        sortOrder: z.number().int().describe("Display order, lowest first."),
      },
    },
    async (input) => {
      try {
        updatePeriod(getDb(), input);
        return ok({ success: true });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "delete_period",
    {
      title: "Delete period",
      description:
        "Deletes a period from the bell schedule and, by cascade, every schedule slot using it.",
      inputSchema: {
        id: z.string().describe("Period ID to delete."),
      },
    },
    async ({ id }) => {
      try {
        deletePeriod(getDb(), id);
        return ok({ success: true });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "assign_schedule_slot",
    {
      title: "Assign schedule slot",
      description:
        "Assigns a class to a period on a cycle day (e.g. Math on Day 1, Period 2). A class has at most one slot per cycle day — assigning a new period for a day it's already scheduled replaces the old one. If a DIFFERENT class already holds that (day, period), the assignment still happens but the result flags a conflictClassName — surface that as a warning, don't silently ignore it. Also marks the cycle day as a meeting day for the class (updates its cycleDays).",
      inputSchema: {
        classId: z.string().describe("Class ID from get_planner_data."),
        periodId: z.string().describe("Period ID from get_schedule."),
        cycleDay: z.number().int().positive().describe("Cycle day (1..schoolYear.cycleLength)."),
      },
    },
    async (input) => {
      try {
        const result = assignScheduleSlot(getDb(), input);
        return ok(result);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "remove_schedule_slot",
    {
      title: "Remove schedule slot",
      description:
        "Removes a schedule slot. Does not change the class's cycleDays (the day may still be a meeting day for other reasons).",
      inputSchema: {
        id: z.string().describe("Schedule slot ID to remove."),
      },
    },
    async ({ id }) => {
      try {
        removeScheduleSlot(getDb(), id);
        return ok({ success: true });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "shift_lessons",
    {
      title: "Shift lessons (cascade reschedule)",
      description:
        "Pushes every lesson in a unit on or after a given date forward (or pulls them back) by a number of the unit's class's actual meeting days — cycle-day aware, not just any instructional day, so lessons only land on days that class really meets. Preserves relative order and spacing. Use this after moving one lesson to a new date, or after inserting a new lesson, so everything scheduled after it shifts out of the way automatically instead of overlapping. Lessons before the given date are untouched.",
      inputSchema: {
        unitId: z.string().describe("Unit ID from get_planner_data."),
        fromDate: z
          .string()
          .describe("ISO date, e.g. 2026-09-15. Every lesson on or after this date shifts."),
        shiftByDays: z
          .number()
          .int()
          .refine((value) => value !== 0, "shiftByDays must not be 0")
          .describe(
            "Number of class-meeting-day occurrences to shift by. Positive pushes lessons later, negative pulls them earlier.",
          ),
      },
    },
    async (input) => {
      try {
        const result = cascadeRescheduleUnitLessons(getDb(), input);
        return ok(result);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "create_unit_with_lessons",
    {
      title: "Create unit with lessons",
      description:
        "Creates a unit and a batch of lessons inside it in a single atomic operation. Use this when importing a whole unit plan with several lessons at once so a failure never leaves a half-created unit behind.",
      inputSchema: {
        unit: z.object(unitInputShape),
        lessons: z
          .array(z.object(lessonInputShape))
          .min(1)
          .describe("Lessons to create inside the new unit."),
      },
    },
    async ({ unit, lessons }) => {
      try {
        const unitId = createUnitWithLessons(getDb(), { unit, lessons });
        return ok({ unitId, lessonCount: lessons.length });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "create_lesson",
    {
      title: "Create lesson",
      description: "Creates a new lesson inside an existing unit. Returns the new lesson's ID.",
      inputSchema: {
        unitId: z.string().describe("Unit ID from get_planner_data to attach this lesson to."),
        ...lessonInputShape,
      },
    },
    async (input) => {
      try {
        const id = createLesson(getDb(), input);
        return ok({ lessonId: id });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "update_lesson",
    {
      title: "Update lesson",
      description:
        "Updates an existing lesson's fields, including which unit it belongs to. All fields are required and replace the current values — call get_planner_data first to see the current values.",
      inputSchema: {
        id: z.string().describe("Lesson ID to update."),
        unitId: z.string().describe("Unit ID this lesson belongs to."),
        ...lessonInputShape,
      },
    },
    async (input) => {
      try {
        updateLesson(getDb(), input);
        return ok({ success: true });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "extend_lesson",
    {
      title: "Extend lesson to another day",
      description:
        "Duplicates a lesson onto its class's next actual meeting date (cycle-day aware — not just the next calendar day) as a linked continuation, e.g. when a lesson runs long and needs a second day. The new lesson is titled '<original> (cont'd)', copies the same sections/outcomes, and links back via continuesFromLessonId. Fails if the class has no more meeting days left in the school year.",
      inputSchema: {
        lessonId: z.string().describe("Lesson ID to extend."),
      },
    },
    async ({ lessonId }) => {
      try {
        const result = duplicateLessonAsContinuation(getDb(), lessonId);
        return ok(result);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_unit",
    {
      title: "Get unit",
      description: "Fetches a single unit and its lessons by ID.",
      inputSchema: {
        id: z.string(),
      },
    },
    async ({ id }) => {
      try {
        const unit = getUnitById(getDb(), id);
        if (!unit) {
          return fail(`Unit not found: ${id}`);
        }
        return ok(unit);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "get_lesson",
    {
      title: "Get lesson",
      description: "Fetches a single lesson by ID.",
      inputSchema: {
        id: z.string(),
      },
    },
    async ({ id }) => {
      try {
        const lesson = getLessonById(getDb(), id);
        if (!lesson) {
          return fail(`Lesson not found: ${id}`);
        }
        return ok(lesson);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "import_lesson_markdown",
    {
      title: "Import lesson from Markdown",
      description:
        "Parses a single lesson written in ClassPilot's Markdown lesson format (see docs/lesson-import-template.md in the repo) and creates it. The Markdown's `Unit:` line must match an existing unit's ID or title exactly (case-insensitive) — call get_planner_data or create_unit first if the unit doesn't exist yet. Any `Outcomes:` codes must match existing outcome codes or IDs.",
      inputSchema: {
        markdown: z.string().min(1),
      },
    },
    async ({ markdown }) => {
      try {
        const parsed = parseLessonMarkdown(markdown);
        const planner = getPlannerData(getDb());

        const unit = planner.units.find((candidate) =>
          matchesReference(candidate.id, candidate.title, parsed.unitRef),
        );
        if (!unit) {
          return fail(
            `No unit matches "${parsed.unitRef}". Call get_planner_data to see existing unit titles/IDs, or create_unit first.`,
          );
        }

        const outcomeIds: string[] = [];
        for (const ref of parsed.outcomeRefs) {
          const outcome = planner.outcomes.find((candidate) =>
            matchesReference(candidate.id, candidate.code, ref),
          );
          if (!outcome) {
            return fail(`No curriculum outcome matches "${ref}".`);
          }
          outcomeIds.push(outcome.id);
        }

        const lessonId = createLesson(getDb(), {
          date: parsed.date,
          durationMinutes: parsed.durationMinutes,
          outcomeIds,
          sections: parsed.sections,
          status: parsed.status,
          summary: parsed.summary,
          title: parsed.title,
          unitId: unit.id,
        });

        return ok({ lessonId, unitId: unit.id, unitTitle: unit.title, outcomeIds });
      } catch (error) {
        return fail(error);
      }
    },
  );
}
