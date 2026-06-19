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
  const config = getAiConfig();

  if (!config) {
    throw new AiError(
      "not_configured",
      "The AI assistant is not configured. Set CLASSPILOT_AI_API_KEY (or CLASSPILOT_AI_BASE_URL for a local model).",
    );
  }

  const messages = buildUnitOutlineMessages(request);
  const content = await requestChatCompletion(config, messages, options);

  return parseUnitOutlineDraft(content);
}
