import { TranscriptionError, type TranscriptionConfig } from "./types";

type TranscriptionResponse = {
  text?: string;
};

/**
 * Calls an OpenAI-Whisper-API-compatible `/v1/audio/transcriptions`
 * endpoint (multipart form: `file` + `model`) and returns the transcript
 * text. Most self-hosted Whisper-family servers (faster-whisper, whisper.cpp
 * server mode, LocalAI, etc.) implement this same contract, so this client
 * should work against whatever local service issue #36 stands up without
 * changes -- if the real server's shape differs once it exists, adjust this
 * one function rather than anything upstream of it.
 */
export async function requestTranscription(
  config: TranscriptionConfig,
  audio: Buffer,
  fileName: string,
): Promise<string> {
  const form = new FormData();
  form.append("model", config.model);
  form.append("file", new Blob([new Uint8Array(audio)]), fileName);

  let response: Response;

  try {
    response = await fetch(`${config.baseUrl}/v1/audio/transcriptions`, {
      method: "POST",
      body: form,
    });
  } catch (error) {
    throw new TranscriptionError(
      "request_failed",
      `Could not reach the transcription service: ${(error as Error).message}`,
    );
  }

  if (!response.ok) {
    const detail = await safeReadText(response);
    throw new TranscriptionError(
      "request_failed",
      `Transcription service returned ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  let payload: TranscriptionResponse;
  try {
    payload = (await response.json()) as TranscriptionResponse;
  } catch {
    throw new TranscriptionError(
      "request_failed",
      "Transcription service returned a non-JSON body.",
    );
  }

  const text = payload.text?.trim();

  if (!text) {
    throw new TranscriptionError("request_failed", "Transcription service returned no text.");
  }

  return text;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    return text.slice(0, 300);
  } catch {
    return "";
  }
}
