import type {
  ChatMessage,
  LessonDraftRequest,
  LessonResourceRequest,
  LessonResourceType,
  UnitOutlineRequest,
} from "./types";

const noteCategoryList = [
  "academic",
  "behavior",
  "attendance",
  "social_emotional",
  "family",
  "medical",
  "other",
];

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

const resourceTypeInstructions: Record<LessonResourceType, string> = {
  exit_card: [
    "Draft a one-page exit card: 2-4 short questions or prompts a student",
    "answers in the last few minutes of the lesson to show what they",
    "understood. Keep language age-appropriate and each prompt on its own",
    "line.",
  ].join(" "),
  handout: [
    "Draft a one-page student handout: a short title, brief instructions or",
    "notes, and any practice items or organizers the lesson needs. Use",
    "Markdown headings and lists so it's easy to scan and print.",
  ].join(" "),
  slide_outline: [
    "Draft a slide-by-slide outline for this lesson: one Markdown heading",
    "per slide (\"## Slide 1: ...\") with a few bullet points of what goes on",
    "it. Aim for 5-10 slides covering the lesson's flow from opening to",
    "close.",
  ].join(" "),
};

/**
 * Builds the chat messages for drafting a printable/copyable lesson
 * resource (handout, exit card, or slide outline) as plain Markdown — no
 * JSON wrapper, unlike the outline/section drafters, since the output here
 * is just the document itself. Pure and deterministic; only the
 * non-sensitive fields of {@link LessonResourceRequest} are ever included.
 */
export function buildLessonResourceMessages(request: LessonResourceRequest): ChatMessage[] {
  const systemPrompt = [
    "You are a planning assistant for an elementary homeroom teacher.",
    "You draft one classroom resource as plain Markdown — no JSON, no code",
    "fences, no commentary before or after. Stay grounded in the curriculum",
    "outcomes provided and do not invent outcome codes that were not given",
    "to you. Never reference or assume anything about individual children",
    "in the class.",
    "",
    resourceTypeInstructions[request.resourceType],
  ].join("\n");

  const userPrompt = [
    `Subject: ${request.subject}`,
    `Grade: ${request.grade}`,
    `Lesson: ${request.lessonTitle}`,
    `Focus: ${request.lessonFocus || "(none provided — infer from the lesson title)"}`,
    request.teachingNotes
      ? `Teaching preferences: ${request.teachingNotes}`
      : "Teaching preferences: (none provided)",
    "",
    "Curriculum outcomes for this lesson:",
    buildOutcomeLines(request.outcomes),
  ].join("\n");

  return [
    { role: "system", content: systemPrompt },
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

/**
 * Builds the messages for turning a dictated transcript into draft
 * per-student notes (issue #36 phase 3). This is the one prompt in this
 * file that handles real student data (names, whatever the teacher said
 * about them) -- the caller MUST resolve the local-only model config
 * (getLocalAiConfig), never the hosted one, before using this. Student-ID
 * matching happens in code afterward (matchStudentName), not here -- the
 * model returns a plain name string per entry, never asked to invent or
 * guess a database ID.
 */
export function buildDictationDraftMessages(
  transcript: string,
  rosterNames: string[],
  recordedDate: string,
): ChatMessage[] {
  const systemPrompt = [
    "You are helping a teacher turn a dictated voice memo about their day",
    "into draft notes for their student records. Read the transcript and",
    "identify every distinct student it mentions by name. For each one,",
    "write ONE note capturing what was said about them -- academic",
    "progress, behavior, attendance, a social/emotional observation, a",
    "family update, a medical note, or something else.",
    "",
    "Only include students actually named in the transcript. Never invent",
    "a student, never combine two different students into one entry, and",
    "never fabricate details that weren't said. If the transcript has no",
    "identifiable student content at all, return an empty list.",
    "",
    `Known students this year: ${rosterNames.join(", ") || "(none on the roster yet)"}.`,
    "Use a name exactly as it appears in that list when you can match one;",
    "if the transcript names someone not on that list (or you're not sure",
    "which roster entry it is), still write the note and put the name",
    "exactly as heard in \"studentName\" -- the app resolves the match, not you.",
    "",
    "Respond with ONLY a JSON array (no markdown fences, no prose) matching:",
    "[",
    "  {",
    '    "studentName": string,',
    `    "category": one of ${JSON.stringify(noteCategoryList)},`,
    '    "subject": string (a short title for the note, or ""),',
    '    "body": string',
    "  }",
    "]",
  ].join("\n");

  const userPrompt = [
    `Date this was dictated: ${recordedDate}`,
    "",
    "Transcript:",
    transcript,
  ].join("\n");

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}
