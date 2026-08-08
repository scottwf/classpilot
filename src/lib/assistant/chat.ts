import { AiError, type AiConfig } from "@/src/lib/ai/types";
import type { ClassPilotDatabase } from "@/src/lib/db/sqlite";
import { assistantTools, findTool, type AssistantTool } from "./tools";

export type ChatToolCall = {
  id: string;
  name: string;
  /** Raw JSON string as returned by the model — parsed defensively per call,
   * since a model can return malformed arguments. */
  arguments: string;
};

export type OrchestratorMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; toolCalls?: ChatToolCall[] }
  | { role: "tool"; toolCallId: string; toolName: string; content: string };

/** One tool call plus its result, for rendering a transcript in the chat UI
 * (e.g. "Created class: Grade 6 ELA") without the teacher needing to read
 * raw JSON. */
export type ToolCallRecord = {
  name: string;
  arguments: Record<string, unknown>;
  result: { ok: boolean; data?: unknown; error?: string };
};

export type AssistantChatResult = {
  reply: string;
  toolCalls: ToolCallRecord[];
  /** Which provider actually drove this turn — surfaced in the UI so the
   * teacher can tell whether student-record tools were available. */
  driver: "local" | "hosted";
};

const maxToolCallRounds = 8;

type WireMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: WireToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

type WireToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: WireToolCall[];
    };
  }>;
};

function toWireMessage(message: OrchestratorMessage): WireMessage {
  if (message.role === "tool") {
    return { content: message.content, role: "tool", tool_call_id: message.toolCallId };
  }

  if (message.role === "assistant") {
    return {
      content: message.content,
      role: "assistant",
      tool_calls: message.toolCalls?.map((call) => ({
        function: { arguments: call.arguments, name: call.name },
        id: call.id,
        type: "function" as const,
      })),
    };
  }

  return message;
}

function toWireTool(tool: AssistantTool) {
  return {
    function: {
      description: tool.description,
      name: tool.name,
      parameters: tool.parameters,
    },
    type: "function" as const,
  };
}

async function requestAssistantMessage(
  config: AiConfig,
  messages: OrchestratorMessage[],
  tools: AssistantTool[],
  options: { signal?: AbortSignal } = {},
): Promise<{ content: string | null; toolCalls: ChatToolCall[] }> {
  let response: Response;

  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      body: JSON.stringify({
        messages: messages.map(toWireMessage),
        model: config.model,
        temperature: 0.3,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        tools: tools.length > 0 ? tools.map(toWireTool) : undefined,
      }),
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      method: "POST",
      signal: options.signal,
    });
  } catch (error) {
    throw new AiError(
      "request_failed",
      `Could not reach the AI provider: ${(error as Error).message}`,
    );
  }

  if (!response.ok) {
    const detail = await safeReadText(response);
    throw new AiError(
      "request_failed",
      `AI provider returned ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  let payload: ChatCompletionResponse;
  try {
    payload = (await response.json()) as ChatCompletionResponse;
  } catch {
    throw new AiError("request_failed", "AI provider returned a non-JSON body.");
  }

  const message = payload.choices?.[0]?.message;

  return {
    content: message?.content ?? null,
    toolCalls: (message?.tool_calls ?? []).map((call) => ({
      arguments: call.function.arguments,
      id: call.id,
      name: call.function.name,
    })),
  };
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return (await response.text()).trim().slice(0, 300);
  } catch {
    return "";
  }
}

function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export type RunAssistantChatInput = {
  db: ClassPilotDatabase;
  driver: "local" | "hosted";
  driverConfig: AiConfig;
  /** Full history including the new user message, oldest first. System
   * prompt is prepended by this function — don't include one. */
  messages: OrchestratorMessage[];
};

const baseSystemPrompt = [
  "You are ClassPilot's planning assistant, embedded in a teacher's plan-book",
  "app. You have tools to look up and change real classes, units, lessons,",
  "and (when available) student records. Prefer calling a list_* tool to look",
  "up real IDs before creating or updating something — never invent an id.",
  "For content generation (draft_unit_outline, draft_lesson_sections), draft",
  "first and confirm with the teacher before saving with save_unit_from_outline",
  "or create_lesson, unless the teacher has clearly already approved the plan.",
  "Keep replies brief and concrete: say what you did or found, not what you",
  "'re about to do.",
].join("\n");

const noStudentToolsNotice = [
  "",
  "No local model is configured, so student-record tools are not available",
  "to you right now — if the teacher asks about students, tell them to",
  "configure a local model on the Settings page to enable that.",
].join("\n");

/**
 * Runs the assistant chat's tool-calling loop to completion (or until
 * maxToolCallRounds is hit) and returns the final reply plus a transcript of
 * every tool call made.
 *
 * Routing: the local model (Ollama, etc.) drives the ENTIRE loop whenever
 * it's configured — every tool, including student-record ones, is only
 * ever offered to it, so student data never reaches a hosted API. If no
 * local model is configured, the hosted provider drives instead, but
 * student-record tools are excluded from its tool list entirely (it simply
 * doesn't know they exist). Content-generation tools (draft_unit_outline,
 * draft_lesson_sections) still make their own separate, scoped call to the
 * hosted provider when available — see tools.ts — regardless of which
 * model is driving this loop.
 */
/**
 * Which tools a given driver is allowed to see. The local driver gets
 * everything; the hosted driver never gets student-data tools — this is
 * the actual enforcement point for the "student data never reaches a
 * hosted API" guarantee, so it's exported and unit-tested directly rather
 * than only exercised indirectly through the (unmocked, network-calling)
 * runAssistantChat.
 */
export function availableToolsForDriver(driver: "local" | "hosted"): AssistantTool[] {
  return driver === "local" ? assistantTools : assistantTools.filter((tool) => !tool.touchesStudentData);
}

export async function runAssistantChat(input: RunAssistantChatInput): Promise<AssistantChatResult> {
  const availableTools = availableToolsForDriver(input.driver);

  const systemPrompt =
    input.driver === "hosted" ? `${baseSystemPrompt}${noStudentToolsNotice}` : baseSystemPrompt;

  const conversation: OrchestratorMessage[] = [
    { content: systemPrompt, role: "system" },
    ...input.messages,
  ];
  const toolCallRecords: ToolCallRecord[] = [];

  for (let round = 0; round < maxToolCallRounds; round += 1) {
    const assistantMessage = await requestAssistantMessage(
      input.driverConfig,
      conversation,
      availableTools,
    );

    if (assistantMessage.toolCalls.length === 0) {
      return {
        driver: input.driver,
        reply: assistantMessage.content?.trim() || "(no response)",
        toolCalls: toolCallRecords,
      };
    }

    conversation.push({
      content: assistantMessage.content,
      role: "assistant",
      toolCalls: assistantMessage.toolCalls,
    });

    for (const call of assistantMessage.toolCalls) {
      const args = parseToolArguments(call.arguments);
      const tool = findTool(call.name);
      const result =
        tool && availableTools.includes(tool)
          ? await tool.execute(input.db, args)
          : { error: `Unknown or unavailable tool: ${call.name}`, ok: false as const };

      toolCallRecords.push({
        arguments: args,
        name: call.name,
        result,
      });

      conversation.push({
        content: JSON.stringify(result),
        role: "tool",
        toolCallId: call.id,
        toolName: call.name,
      });
    }
  }

  return {
    driver: input.driver,
    reply:
      "I ran out of tool-call steps for this turn — here's what I did so far. Ask me to continue if needed.",
    toolCalls: toolCallRecords,
  };
}
