import { randomUUID } from "node:crypto";
import type { DictationDraftNote } from "@/src/features/dictation/types";
import { matchStudentName, type MatchableStudent } from "@/src/features/dictation/student-match";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { recordAiUsage } from "@/src/lib/db/ai-usage-repository";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import { getLocalAiConfig } from "./config";
import { buildDictationDraftMessages } from "./prompt";
import { parseDictationDraftsRaw } from "./parse";
import { requestChatCompletion } from "./provider";
import { AiError } from "./types";

/**
 * Turns a dictation transcript into draft per-student notes (issue #36
 * phase 3). Deliberately uses ONLY the local model config, never the
 * hosted one -- unlike generateLessonResource/generateUnitOutline, this
 * prompt contains real student names and whatever the teacher said about
 * them, so it must never leave the LAN, matching the same guarantee
 * touchesStudentData-tagged assistant tools already make. Throws AiError
 * `not_configured` if no local model is set up, rather than silently
 * falling back to a hosted provider.
 */
export async function generateDictationDrafts(
  transcript: string,
  roster: MatchableStudent[],
  recordedDate: string,
  options: { signal?: AbortSignal } = {},
): Promise<DictationDraftNote[]> {
  const db = getClassPilotDatabase();
  const settings = getAppSettings(db);
  const config = getLocalAiConfig({
    baseUrl: settings.aiLocalBaseUrl,
    model: settings.aiLocalModel,
  });

  if (!config) {
    throw new AiError(
      "not_configured",
      "No local model is configured. Set one up on the Settings page (or CLASSPILOT_AI_LOCAL_BASE_URL / CLASSPILOT_AI_LOCAL_MODEL) -- this step never uses a hosted provider, since the transcript may contain real student details.",
    );
  }

  const rosterNames = roster.map((student) =>
    [student.preferredName, student.firstName].filter(Boolean).join(" / "),
  );
  const messages = buildDictationDraftMessages(transcript, rosterNames, recordedDate);
  const { content: raw, usage } = await requestChatCompletion(config, messages, options);

  // Counts only -- the usage log never stores prompt or completion text, so
  // logging a student-data call here leaks nothing (see ai_usage_log).
  recordAiUsage(db, { model: config.model, provider: "local", purpose: "dictation_draft", usage });

  const parsed = parseDictationDraftsRaw(raw);

  return parsed.map((draft) => ({
    draftId: `draft-${randomUUID()}`,
    studentId: matchStudentName(draft.studentName, roster),
    studentNameGuess: draft.studentName,
    date: recordedDate,
    category: draft.category,
    subject: draft.subject,
    body: draft.body,
  }));
}
