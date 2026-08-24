import Link from "next/link";
import { Mic, Sparkles, Trash2, X } from "lucide-react";
import type { RosterEntry } from "@/src/features/students/types";
import type { DictationRecording, DictationStatus } from "./types";

type ServerAction = (formData: FormData) => void | Promise<void>;

type DictationDetailPageProps = {
  deleteAction: ServerAction;
  dismissDraftAction: ServerAction;
  error?: string;
  generateDraftsAction: ServerAction;
  recording: DictationRecording;
  roster: RosterEntry[];
  saveDraftNoteAction: ServerAction;
  transcribeAction: ServerAction;
};

const errorMessages: Record<string, string> = {
  not_configured:
    "No transcription service is configured yet (CLASSPILOT_TRANSCRIPTION_URL is unset). Once one's ready, set it and redeploy.",
  transcription_failed:
    "The transcription service couldn't process this recording. Check it's reachable and try again.",
  no_transcript: "Transcribe this recording before generating draft notes.",
  local_ai_not_configured:
    "No local model is configured. Set one up on the Settings page — draft generation never uses a hosted provider, since the transcript may name real students.",
  draft_generation_failed:
    "Couldn't generate draft notes. Check the local model is reachable and try again.",
  incomplete_draft: "Choose a student and enter a note before saving.",
};

const statusLabels: Record<DictationStatus, string> = {
  pending: "Not transcribed yet",
  transcribing: "Transcribing…",
  transcribed: "Transcribed",
  failed: "Transcription failed",
};

const noteCategories = [
  "academic",
  "behavior",
  "attendance",
  "social_emotional",
  "family",
  "medical",
  "other",
] as const;

function labelText(value: string): string {
  return value.replace(/_/g, " ");
}

function studentDisplayName(student: RosterEntry): string {
  return student.preferredName || student.firstName;
}

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export function DictationDetailPage({
  deleteAction,
  dismissDraftAction,
  error,
  generateDraftsAction,
  recording,
  roster,
  saveDraftNoteAction,
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
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-950">Transcript</h3>
            {recording.transcript ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {recording.transcript}
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No speech was detected in this recording.
              </p>
            )}
          </section>

          {recording.transcript ? (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <Sparkles aria-hidden="true" className="size-4" />
                  Draft notes
                </h3>
                <form action={generateDraftsAction}>
                  <input name="recordingId" type="hidden" value={recording.id} />
                  <button
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
                    type="submit"
                  >
                    {recording.drafts.length > 0 ? "Regenerate" : "Generate draft notes"}
                  </button>
                </form>
              </div>

              {recording.drafts.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Draft notes normally generate automatically right after transcription. If none
                  turned up here — no students were mentioned, or the local model wasn&apos;t
                  reachable — use the button above to try again. Nothing saves to a student&apos;s
                  record until you review and save it below.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {recording.drafts.map((draft) => (
                    <div
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      key={draft.draftId}
                    >
                      {!draft.studentId ? (
                        <p className="mb-2 text-xs font-medium text-amber-700">
                          Heard &quot;{draft.studentNameGuess}&quot; — couldn&apos;t match a
                          student on the roster. Choose one below.
                        </p>
                      ) : null}
                      <form action={saveDraftNoteAction} className="space-y-3">
                        <input name="recordingId" type="hidden" value={recording.id} />
                        <input name="draftId" type="hidden" value={draft.draftId} />
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="block text-sm">
                            <span className="font-medium text-slate-700">Student</span>
                            <select
                              className={inputClass}
                              defaultValue={draft.studentId ?? ""}
                              name="studentId"
                            >
                              <option disabled value="">
                                Choose a student
                              </option>
                              {roster.map((student) => (
                                <option key={student.id} value={student.id}>
                                  {studentDisplayName(student)} {student.lastName}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-sm">
                            <span className="font-medium text-slate-700">Date</span>
                            <input
                              className={inputClass}
                              defaultValue={draft.date}
                              name="date"
                              type="date"
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="font-medium text-slate-700">Category</span>
                            <select
                              className={inputClass}
                              defaultValue={draft.category}
                              name="category"
                            >
                              {noteCategories.map((category) => (
                                <option key={category} value={category}>
                                  {labelText(category)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label className="block text-sm">
                          <span className="font-medium text-slate-700">Subject (optional)</span>
                          <input className={inputClass} defaultValue={draft.subject} name="subject" />
                        </label>
                        <label className="block text-sm">
                          <span className="font-medium text-slate-700">Note</span>
                          <textarea
                            className={inputClass}
                            defaultValue={draft.body}
                            name="body"
                            rows={3}
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
                            type="submit"
                          >
                            Save to student record
                          </button>
                        </div>
                      </form>
                      <form action={dismissDraftAction} className="mt-2">
                        <input name="recordingId" type="hidden" value={recording.id} />
                        <input name="draftId" type="hidden" value={draft.draftId} />
                        <button
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-700"
                          type="submit"
                        >
                          <X aria-hidden="true" className="size-3" />
                          Dismiss without saving
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : (
        <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <Mic aria-hidden="true" className="mx-auto size-6 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600">
            {recording.status === "transcribing"
              ? "Transcribing now — this can take a minute for a longer recording."
              : recording.status === "failed"
                ? "Transcription failed. Try again below."
                : "Transcription normally starts automatically on upload — this one hasn't run yet."}
          </p>
          {recording.status !== "transcribing" ? (
            <form action={transcribeAction} className="mt-3">
              <input name="recordingId" type="hidden" value={recording.id} />
              <button
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                type="submit"
              >
                {recording.status === "failed" ? "Retry transcription" : "Transcribe"}
              </button>
            </form>
          ) : null}
        </section>
      )}
    </>
  );
}
