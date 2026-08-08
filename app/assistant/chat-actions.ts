"use server";

import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { getAppSettings } from "@/src/lib/db/settings-repository";
import { getAiConfig, getLocalAiConfig } from "@/src/lib/ai/config";
import { AiError } from "@/src/lib/ai/types";
import {
  runAssistantChat,
  type AssistantChatResult,
  type OrchestratorMessage,
} from "@/src/lib/assistant/chat";

export type SendChatMessageResult = AssistantChatResult | { error: string };

/**
 * Sends one user turn through the assistant chat's tool-calling loop.
 * `history` is the prior conversation (no system prompt — runAssistantChat
 * adds one); this appends the new user message and returns the reply plus
 * a transcript of any tools called. See chat.ts for the local/hosted
 * routing rule.
 */
export async function sendChatMessageAction(
  history: OrchestratorMessage[],
  userMessage: string,
): Promise<SendChatMessageResult> {
  await requireAuth();

  const trimmed = userMessage.trim();
  if (!trimmed) {
    return { error: "Message can't be empty." };
  }

  const db = getClassPilotDatabase();
  const settings = getAppSettings(db);
  const localConfig = getLocalAiConfig({
    baseUrl: settings.aiLocalBaseUrl,
    model: settings.aiLocalModel,
  });
  const hostedConfig = getAiConfig({
    apiKey: settings.aiApiKey,
    baseUrl: settings.aiBaseUrl,
    model: settings.aiModel,
  });

  const driver = localConfig ? "local" : hostedConfig ? "hosted" : null;
  const driverConfig = localConfig ?? hostedConfig;

  if (!driver || !driverConfig) {
    return {
      error:
        "The assistant isn't configured yet. Set up a local model or a hosted provider on the Settings page.",
    };
  }

  try {
    return await runAssistantChat({
      db,
      driver,
      driverConfig,
      messages: [...history, { content: trimmed, role: "user" }],
    });
  } catch (error) {
    return {
      error:
        error instanceof AiError
          ? error.message
          : "Something went wrong talking to the AI provider. Please try again.",
    };
  }
}
