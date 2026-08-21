import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import { getAiConfig } from "./config";
import { buildLessonResourceMessages } from "./prompt";
import { requestChatCompletion } from "./provider";
import { AiError, type LessonResourceRequest } from "./types";

/**
 * Drafts a printable/copyable lesson resource (handout, exit card, or
 * slide outline) from minimized, non-sensitive planning context. Returns
 * plain Markdown text directly — unlike generateUnitOutline/
 * generateLessonSections there's no JSON shape to parse, since the
 * resource IS the output. Throws {@link AiError} with code
 * `not_configured` when the assistant is disabled so callers can render a
 * setup hint instead of failing hard.
 */
export async function generateLessonResource(
  request: LessonResourceRequest,
  options: { signal?: AbortSignal } = {},
): Promise<string> {
  const settings = getAppSettings(getClassPilotDatabase());
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

  const messages = buildLessonResourceMessages(request);
  return requestChatCompletion(config, messages, options);
}
