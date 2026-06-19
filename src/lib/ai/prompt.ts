import type { ChatMessage, UnitOutlineRequest } from "./types";

const systemPrompt = [
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

  const outcomeLines =
    request.outcomes.length > 0
      ? request.outcomes
          .map((outcome) => `- ${outcome.code}: ${outcome.description}`)
          .join("\n")
      : "- (No specific outcomes selected; suggest grade-appropriate focuses.)";

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
    outcomeLines,
    "",
    `Draft about ${totalLessons} lessons in lessonSequence, sequenced for a`,
    "logical build from introduction to assessment. Reference outcome codes only",
    "from the list above.",
  ].join("\n");

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}
