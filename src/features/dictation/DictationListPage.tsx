import Link from "next/link";
import { Keyboard, Mic } from "lucide-react";
import { DictationTextInput } from "./DictationTextInput";
import type { DictationRecording, DictationStatus } from "./types";

type DictationListPageProps = {
  error?: string;
  recordings: DictationRecording[];
  submitTextAction: (formData: FormData) => void | Promise<void>;
  uploadAction: (formData: FormData) => void | Promise<void>;
};

const errorMessages: Record<string, string> = {
  file: "Choose an audio file to upload.",
  filetype: "That file type isn't supported. Use an m4a, mp3, wav, webm, ogg, or aac recording.",
  filesize: "That file is too large (50 MB max).",
  empty_text: "Paste or dictate some text first.",
};

const statusLabels: Record<DictationStatus, string> = {
  pending: "Not transcribed yet",
  transcribing: "Transcribing…",
  transcribed: "Transcribed",
  failed: "Transcription failed",
};

const statusClasses: Record<DictationStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  transcribing: "bg-blue-50 text-blue-700",
  transcribed: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-700",
};

export function DictationListPage({
  error,
  recordings,
  submitTextAction,
  uploadAction,
}: DictationListPageProps) {
  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">Dictation</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Dictate notes about your students.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Upload a voice recording — from your phone, watch, or computer — and it&apos;s
          transcribed automatically, then you can generate draft notes for the students it
          mentions. Nothing saves to a student&apos;s record until you review and confirm it.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">Recordings</h3>

          {recordings.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No recordings yet. Upload one to get started.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recordings.map((recording) => (
                <li key={recording.id}>
                  <Link
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100"
                    href={`/students/dictate/${recording.id}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-950">
                        {recording.originalFilename}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{recording.recordedDate}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${statusClasses[recording.status]}`}
                    >
                      {statusLabels[recording.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-5">
          {error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessages[error] ?? "Something went wrong. Try again."}
            </p>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Mic aria-hidden="true" className="size-4" />
              Upload a recording
            </h3>

            <form action={uploadAction} className="mt-3 space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Audio file</span>
                <input
                  accept=".m4a,.mp3,.wav,.webm,.ogg,.aac,audio/*"
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
                  name="recordingFile"
                  type="file"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Date this happened</span>
                <input
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  name="recordedDate"
                  type="date"
                />
              </label>

              <button
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                type="submit"
              >
                Upload
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Keyboard aria-hidden="true" className="size-4" />
              Paste or dictate text
            </h3>
            <div className="mt-3">
              <DictationTextInput action={submitTextAction} />
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
