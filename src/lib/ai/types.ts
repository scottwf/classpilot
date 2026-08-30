export type AiConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

/**
 * Token counts reported by an OpenAI-compatible provider's `usage` object
 * (issue #28). Every field defaults to 0 when the provider omits `usage`
 * entirely — some local model servers do — so a call still gets logged and
 * counted even when its token counts aren't available.
 */
export type AiUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

/** What an AI call was for, recorded alongside its token counts so the
 * usage page can show which feature is spending the tokens. */
export type AiUsagePurpose =
  | "unit_outline"
  | "lesson_sections"
  | "lesson_resource"
  | "dictation_draft"
  | "assistant_chat";

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

// Minimized context for unit-outline drafting. Intentionally free of any
// student-identifying information — see docs/student-cms-plan.md (AI data
// minimization). Only curriculum, subject, and timing context is sent.
export type UnitOutlineRequest = {
  subject: string;
  grade: string;
  unitFocus: string;
  weeks: number;
  lessonsPerWeek: number;
  lessonMinutes: number;
  teachingNotes: string;
  outcomes: Array<{
    code: string;
    description: string;
  }>;
};

export type UnitOutlineLesson = {
  title: string;
  focus: string;
  outcomeCodes: string[];
};

export type UnitOutlineDraft = {
  title: string;
  bigIdeas: string[];
  essentialQuestions: string[];
  lessonSequence: UnitOutlineLesson[];
  assessmentIdeas: string[];
  differentiationNotes: string[];
};

// Minimized context for drafting one lesson's structured sections — same data
// minimization guarantee as UnitOutlineRequest above.
export type LessonDraftRequest = {
  subject: string;
  grade: string;
  unitTitle: string;
  lessonTitle: string;
  lessonFocus: string;
  lessonMinutes: number;
  teachingNotes: string;
  outcomes: Array<{
    code: string;
    description: string;
  }>;
};

export type LessonResourceType = "handout" | "exit_card" | "slide_outline";

// Minimized context for drafting a printable/copyable lesson resource — same
// data minimization guarantee as LessonDraftRequest above. Output is plain
// Markdown text (no student data ever appears in it), not a generated file —
// see docs discussion on assistant chat scope (v1: text/Markdown, not
// pptx/pdf generation).
export type LessonResourceRequest = {
  resourceType: LessonResourceType;
  subject: string;
  grade: string;
  lessonTitle: string;
  lessonFocus: string;
  teachingNotes: string;
  outcomes: Array<{
    code: string;
    description: string;
  }>;
};

export class AiError extends Error {
  readonly code: "not_configured" | "request_failed" | "parse_failed";

  constructor(code: AiError["code"], message: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}
