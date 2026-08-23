export class TranscriptionError extends Error {
  readonly code: "not_configured" | "request_failed";

  constructor(code: TranscriptionError["code"], message: string) {
    super(message);
    this.name = "TranscriptionError";
    this.code = code;
  }
}

export type TranscriptionConfig = {
  baseUrl: string;
};
