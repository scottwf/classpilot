import { TranscriptionError, type TranscriptionConfig } from "./types";

type TranscriptionResponse = {
  text?: string;
};

/**
 * Calls the `ahmetoner/whisper-asr-webservice` `/asr` endpoint (multipart
 * form, field name `audio_file`) with `?output=json`, and returns the
 * transcript text. This is the specific service issue #36 deployed on
 * xbox (faster-whisper engine, GPU-accelerated) -- confirmed against the
 * real running instance 2026-08-23 (`{"language": "en", "segments": [],
 * "text": "..."}`), not guessed from generic API docs.
 */
export async function requestTranscription(
  config: TranscriptionConfig,
  audio: Buffer,
  fileName: string,
): Promise<string> {
  const form = new FormData();
  form.append("audio_file", new Blob([new Uint8Array(audio)]), fileName);

  let response: Response;

  try {
    response = await fetch(`${config.baseUrl}/asr?output=json`, {
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

  // An empty string is a legitimate result (silence/no speech detected --
  // e.g. a test tone with no voice in it), not an error, so don't throw on
  // it the way the AI provider client throws on an empty completion.
  return payload.text ?? "";
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    return text.slice(0, 300);
  } catch {
    return "";
  }
}
