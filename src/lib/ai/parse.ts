import type { LessonSections } from "@/src/features/planner/types";
import { AiError, type UnitOutlineDraft, type UnitOutlineLesson } from "./types";

/**
 * Defensively parses a model response into a {@link UnitOutlineDraft}. Models
 * sometimes wrap JSON in markdown fences or add stray prose, so we extract the
 * first balanced JSON object before parsing, then coerce each field to a known
 * shape. Throws {@link AiError} with code `parse_failed` when no usable object
 * can be recovered.
 */
export function parseUnitOutlineDraft(raw: string): UnitOutlineDraft {
  const json = extractJsonObject(raw);

  if (!json) {
    throw new AiError("parse_failed", "The assistant did not return JSON.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new AiError("parse_failed", "The assistant returned invalid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new AiError("parse_failed", "The assistant returned an unexpected shape.");
  }

  const record = parsed as Record<string, unknown>;

  return {
    title: toStringValue(record.title) || "Untitled unit",
    bigIdeas: toStringArray(record.bigIdeas),
    essentialQuestions: toStringArray(record.essentialQuestions),
    lessonSequence: toLessonArray(record.lessonSequence),
    assessmentIdeas: toStringArray(record.assessmentIdeas),
    differentiationNotes: toStringArray(record.differentiationNotes),
  };
}

/**
 * Defensively parses a model response into a {@link LessonSections} object,
 * for drafting one lesson's structured sections. Same JSON-recovery approach
 * as {@link parseUnitOutlineDraft}. Missing/malformed fields default to an
 * empty string rather than failing the whole draft.
 */
export function parseLessonSectionsDraft(raw: string): LessonSections {
  const json = extractJsonObject(raw);

  if (!json) {
    throw new AiError("parse_failed", "The assistant did not return JSON.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new AiError("parse_failed", "The assistant returned invalid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new AiError("parse_failed", "The assistant returned an unexpected shape.");
  }

  const record = parsed as Record<string, unknown>;

  return {
    assessment: toStringValue(record.assessment),
    differentiation: toStringValue(record.differentiation),
    learningGoals: toStringValue(record.learningGoals),
    lessonFlow: toStringValue(record.lessonFlow),
    materials: toStringValue(record.materials),
    mindsOn: toStringValue(record.mindsOn),
    reflection: toStringValue(record.reflection),
    resources: toStringValue(record.resources),
  };
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return raw.slice(start, end + 1);
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => toStringValue(entry))
    .filter((entry) => entry.length > 0);
}

function toLessonArray(value: unknown): UnitOutlineLesson[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry): UnitOutlineLesson | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const title = toStringValue(record.title);
      const focus = toStringValue(record.focus);

      if (!title && !focus) {
        return null;
      }

      return {
        title: title || "Lesson",
        focus,
        outcomeCodes: toStringArray(record.outcomeCodes),
      };
    })
    .filter((lesson): lesson is UnitOutlineLesson => lesson !== null);
}
