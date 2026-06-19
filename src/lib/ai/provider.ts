import { AiError, type AiConfig, type ChatMessage } from "./types";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

/**
 * Calls an OpenAI-compatible `/chat/completions` endpoint and returns the
 * assistant text. Uses `fetch` only (no SDK dependency) so the same path works
 * against hosted providers and local model servers. This is the only
 * side-effecting function in the AI layer; everything else is pure and tested.
 */
export async function requestChatCompletion(
  config: AiConfig,
  messages: ChatMessage[],
  options: { signal?: AbortSignal } = {},
): Promise<string> {
  let response: Response;

  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey
          ? { Authorization: `Bearer ${config.apiKey}` }
          : {}),
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        messages,
      }),
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

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new AiError("request_failed", "AI provider returned an empty response.");
  }

  return content;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    return text.slice(0, 300);
  } catch {
    return "";
  }
}
