export type AiConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

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

export class AiError extends Error {
  readonly code: "not_configured" | "request_failed" | "parse_failed";

  constructor(code: AiError["code"], message: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}
