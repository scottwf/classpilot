import type { ChatMessage, LessonDraftRequest, UnitOutlineRequest } from "./types";

const unitOutlineSystemPrompt = [
  "You are a planning assistant for an elementary homeroom teacher.",
  "You draft unit outlines that are practical, age-appropriate, and paced to",
  "the real instructional time available. You suggest; the teacher approves and",
  "edits. Stay grounded in the curriculum outcomes provided and do not invent",
  "outcome codes that were not given to you.",
  "",
  "Respond with ONLY a JSON object (no markdown fences, no prose) matching:",
  "{",
  '  "title": string,',
  '  "bigIdeas": string[],',
  '  "essentialQuestions": string[],',
  '  "lessonSequence": [{ "title": string, "focus": string, "outcomeCodes": string[] }],',
  '  "assessmentIdeas": string[],',
  '  "differentiationNotes": string[]',
  "}",
].join("\n");

/**
 * Builds the chat messages for a unit-outline draft. Pure and deterministic so
 * the prompt (and its data-minimization guarantees) can be unit-tested. Only
 * the non-sensitive fields of {@link UnitOutlineRequest} are ever included.
 */
export function buildUnitOutlineMessages(
  request: UnitOutlineRequest,
): ChatMessage[] {
  const totalLessons = Math.max(1, request.weeks * request.lessonsPerWeek);

  const userPrompt = [
    `Subject: ${request.subject}`,
    `Grade: ${request.grade}`,
    `Unit focus: ${request.unitFocus}`,
    `Available time: ${request.weeks} weeks, ${request.lessonsPerWeek} lessons/week ` +
      `(~${totalLessons} lessons), ${request.lessonMinutes} minutes per lesson.`,
    request.teachingNotes
      ? `Teaching preferences: ${request.teachingNotes}`
      : "Teaching preferences: (none provided)",
    "",
    "Curriculum outcomes to cover:",
    buildOutcomeLines(request.outcomes),
    "",
    `Draft about ${totalLessons} lessons in lessonSequence, sequenced for a`,
    "logical build from introduction to assessment. Reference outcome codes only",
    "from the list above.",
  ].join("\n");

  return [
    { role: "system", content: unitOutlineSystemPrompt },
    { role: "user", content: userPrompt },
  ];
}

const lessonDraftSystemPrompt = [
  "You are a planning assistant for an elementary homeroom teacher.",
  "You draft one complete, practical lesson plan with structured sections. You",
  "suggest; the teacher approves and edits. Stay grounded in the curriculum",
  "outcomes provided and do not invent outcome codes that were not given to",
  "you. Never reference or assume anything about individual children in the",
  "class.",
  "",
  "Respond with ONLY a JSON object (no markdown fences, no prose) matching:",
  "{",
  '  "learningGoals": string,',
  '  "materials": string,',
  '  "mindsOn": string,',
  '  "lessonFlow": string,',
  '  "assessment": string,',
  '  "differentiation": string,',
  '  "resources": string,',
  '  "reflection": string',
  "}",
  "Each field is plain text: a short paragraph or a few lines starting with",
  '"- " for a list. No markdown headers. Leave "reflection" as an empty string',
  "— that's filled in by the teacher after teaching.",
].join("\n");

/**
 * Builds the chat messages for drafting one lesson's structured sections.
 * Pure and deterministic. Only the non-sensitive fields of
 * {@link LessonDraftRequest} are ever included — no student data.
 */
export function buildLessonDraftMessages(
  request: LessonDraftRequest,
): ChatMessage[] {
  const userPrompt = [
    `Subject: ${request.subject}`,
    `Grade: ${request.grade}`,
    `Unit: ${request.unitTitle}`,
    `Lesson: ${request.lessonTitle}`,
    `Focus: ${request.lessonFocus || "(none provided — infer from the lesson title and unit)"}`,
    `Duration: ${request.lessonMinutes} minutes`,
    request.teachingNotes
      ? `Teaching preferences: ${request.teachingNotes}`
      : "Teaching preferences: (none provided)",
    "",
    "Curriculum outcomes for this lesson:",
    buildOutcomeLines(request.outcomes),
    "",
    "Draft learning goals, materials, an opening (mindsOn), the main lesson",
    "flow, an assessment idea, a differentiation note, and resources. Reference",
    "outcome codes only from the list above.",
  ].join("\n");

  return [
    { role: "system", content: lessonDraftSystemPrompt },
    { role: "user", content: userPrompt },
  ];
}

function buildOutcomeLines(
  outcomes: Array<{ code: string; description: string }>,
): string {
  return outcomes.length > 0
    ? outcomes.map((outcome) => `- ${outcome.code}: ${outcome.description}`).join("\n")
    : "- (No specific outcomes selected; suggest grade-appropriate focuses.)";
}
