import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { recordAiUsage } from "@/src/lib/db/ai-usage-repository";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import { getAiConfig } from "./config";
import { parseUnitOutlineDraft } from "./parse";
import { buildUnitOutlineMessages } from "./prompt";
import { requestChatCompletion } from "./provider";
import { AiError, type UnitOutlineDraft, type UnitOutlineRequest } from "./types";

/**
 * Generates a unit-outline draft from minimized, non-sensitive planning
 * context. Throws {@link AiError} with code `not_configured` when the assistant
 * is disabled so callers can render a setup hint instead of failing hard.
 */
export async function generateUnitOutline(
  request: UnitOutlineRequest,
  options: { signal?: AbortSignal } = {},
): Promise<UnitOutlineDraft> {
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

  const messages = buildUnitOutlineMessages(request);
  const { content, usage } = await requestChatCompletion(config, messages, options);

  recordAiUsage(db, { model: config.model, provider: "hosted", purpose: "unit_outline", usage });

  return parseUnitOutlineDraft(content);
}
