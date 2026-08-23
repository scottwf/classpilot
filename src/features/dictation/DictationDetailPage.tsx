import Link from "next/link";
import { Mic, Trash2 } from "lucide-react";
import type { DictationRecording, DictationStatus } from "./types";

type DictationDetailPageProps = {
  deleteAction: (formData: FormData) => void | Promise<void>;
  error?: string;
  recording: DictationRecording;
  transcribeAction: (formData: FormData) => void | Promise<void>;
};

const errorMessages: Record<string, string> = {
  not_configured:
    "No transcription service is configured yet (CLASSPILOT_TRANSCRIPTION_URL is unset). Once one's ready, set it and redeploy.",
  transcription_failed:
    "The transcription service couldn't process this recording. Check it's reachable and try again.",
};

const statusLabels: Record<DictationStatus, string> = {
  pending: "Not transcribed yet",
  transcribing: "Transcribing…",
  transcribed: "Transcribed",
  failed: "Transcription failed",
};

export function DictationDetailPage({
  deleteAction,
  error,
  recording,
  transcribeAction,
}: DictationDetailPageProps) {
  return (
    <>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Dictation</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {recording.originalFilename}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {recording.recordedDate} · {statusLabels[recording.status]}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href="/students/dictate"
          >
            Back to recordings
          </Link>
          <form action={deleteAction}>
            <input name="recordingId" type="hidden" value={recording.id} />
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
              type="submit"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </button>
          </form>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessages[error] ?? "Something went wrong."}
        </div>
      ) : null}

      {recording.status === "transcribed" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">Transcript</h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {recording.transcript}
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Turning this into draft student notes for review isn&apos;t built yet — coming next.
          </p>
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <Mic aria-hidden="true" className="mx-auto size-6 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600">
            {recording.status === "transcribing"
              ? "Transcribing now — this can take a minute for a longer recording."
              : "This recording hasn't been transcribed yet."}
          </p>
          {recording.status !== "transcribing" ? (
            <form action={transcribeAction} className="mt-3">
              <input name="recordingId" type="hidden" value={recording.id} />
              <button
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                type="submit"
              >
                Transcribe
              </button>
            </form>
          ) : null}
        </section>
      )}
    </>
  );
}
