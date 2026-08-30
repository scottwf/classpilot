import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { recordAiUsage } from "@/src/lib/db/ai-usage-repository";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import type { LessonSections } from "@/src/features/planner/types";
import { getAiConfig } from "./config";
import { parseLessonSectionsDraft } from "./parse";
import { buildLessonDraftMessages } from "./prompt";
import { requestChatCompletion } from "./provider";
import { AiError, type LessonDraftRequest } from "./types";

/**
 * Generates a single lesson's structured sections from minimized, non-
 * sensitive planning context. Throws {@link AiError} with code
 * `not_configured` when the assistant is disabled so callers can render a
 * setup hint instead of failing hard.
 */
export async function generateLessonSections(
  request: LessonDraftRequest,
  options: { signal?: AbortSignal } = {},
): Promise<LessonSections> {
  const db = getClassPilotDatabase();
  const settings = getAppSettings(db);
  const config = getAiConfig({
    apiKey: settings.aiApiKey,
    baseUrl: settings.aiBaseUrl,
    model: settings.aiModel,
  });

  if (!config) {
    throw new AiError(
      "not_configured",
      "The AI assistant is not configured. Set an API key or local model URL on the Settings page (or CLASSPILOT_AI_API_KEY / CLASSPILOT_AI_BASE_URL).",
    );
  }

  const messages = buildLessonDraftMessages(request);
  const { content, usage } = await requestChatCompletion(config, messages, options);

  recordAiUsage(db, { model: config.model, provider: "hosted", purpose: "lesson_sections", usage });

  return parseLessonSectionsDraft(content);
}
