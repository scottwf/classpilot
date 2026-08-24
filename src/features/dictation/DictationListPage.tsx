"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, Keyboard, Mic, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { RosterEntry } from "@/src/features/students/types";
import { DictationTextInput } from "./DictationTextInput";
import {
  formatDuration,
  sortRecordings,
  transcriptPreview,
  transcriptWordCount,
  type DictationSort,
} from "./list-utils";
import type { DictationRecording, DictationStatus } from "./types";

type ServerAction = (formData: FormData) => void | Promise<void>;

type DictationListPageProps = {
  archiveAction: ServerAction;
  deleteAction: ServerAction;
  error?: string;
  recordings: DictationRecording[];
  students: RosterEntry[];
  submitTextAction: ServerAction;
  uploadAction: ServerAction;
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

function studentName(student: RosterEntry): string {
  return `${student.preferredName || student.firstName} ${student.lastName}`;
}

export function DictationListPage({
  archiveAction,
  deleteAction,
  error,
  recordings,
  students,
  submitTextAction,
  uploadAction,
}: DictationListPageProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<DictationStatus | "">("");
  const [sort, setSort] = useState<DictationSort>("newest");
  const [selected, setSelected] = useState<string[]>([]);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const studentNames = useMemo(
    () => new Map(students.map((student) => [student.id, studentName(student)])),
    [students],
  );
  const visible = useMemo(
    () =>
      sortRecordings(
        recordings.filter(
          (recording) =>
            Boolean(recording.archivedAt) === showArchived &&
            (!studentId || recording.studentIds.includes(studentId)) &&
            (!status || recording.status === status),
        ),
        sort,
      ),
    [recordings, showArchived, studentId, status, sort],
  );
  const selectedVisible = selected.filter((id) => visible.some((recording) => recording.id === id));

  function toggleSelected(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id],
    );
  }

  function captureDuration(file: File | undefined) {
    setDurationSeconds(null);
    if (!file) return;
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      setDurationSeconds(Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration) : null);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => URL.revokeObjectURL(url);
    audio.src = url;
  }

  function selectionFields() {
    return selectedVisible.map((id) => <input key={id} name="recordingId" type="hidden" value={id} />);
  }

  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">Dictation</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">Dictate notes about your students.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Upload a voice recording or paste text, then review draft notes before anything saves to a student record.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-950">{showArchived ? "Archived recordings" : "Recordings"}</h3>
            <button
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-950"
              onClick={() => { setShowArchived((value) => !value); setSelected([]); }}
              type="button"
            >
              {showArchived ? <ArchiveRestore aria-hidden="true" className="size-3" /> : <Archive aria-hidden="true" className="size-3" />}
              {showArchived ? "Show active" : "Show archived"}
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <select aria-label="Filter by student" className="rounded-md border border-slate-300 px-2 py-1.5 text-xs" onChange={(event) => setStudentId(event.target.value)} value={studentId}>
              <option value="">All students</option>
              {students.map((student) => <option key={student.id} value={student.id}>{studentName(student)}</option>)}
            </select>
            <select aria-label="Filter by transcription status" className="rounded-md border border-slate-300 px-2 py-1.5 text-xs" onChange={(event) => setStatus(event.target.value as DictationStatus | "")} value={status}>
              <option value="">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select aria-label="Sort recordings" className="rounded-md border border-slate-300 px-2 py-1.5 text-xs" onChange={(event) => setSort(event.target.value as DictationSort)} value={sort}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="duration">Longest duration</option>
              <option value="words">Most words</option>
            </select>
          </div>

          {selectedVisible.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-slate-100 p-2 text-xs text-slate-700">
              <span>{selectedVisible.length} selected</span>
              {!showArchived ? <form action={archiveAction}>{selectionFields()}<button className="rounded-md bg-white px-2 py-1 font-medium shadow-sm" type="submit">Archive selected</button></form> : null}
              <form action={deleteAction} onSubmit={(event) => { if (!window.confirm(`Delete ${selectedVisible.length} recording${selectedVisible.length === 1 ? "" : "s"}? Stored audio will be permanently removed.`)) event.preventDefault(); }}>
                {selectionFields()}<button className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 font-medium text-white" type="submit"><Trash2 aria-hidden="true" className="size-3" />Delete selected</button>
              </form>
            </div>
          ) : null}

          {visible.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">No {showArchived ? "archived " : ""}recordings match these filters.</p>
          ) : (
            <ul className="mt-3 space-y-2">{visible.map((recording) => (
              <li className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3" key={recording.id}>
                <input aria-label={`Select ${recording.originalFilename}`} checked={selected.includes(recording.id)} className="mt-1 size-4" onChange={() => toggleSelected(recording.id)} type="checkbox" />
                <Link className="min-w-0 flex-1" href={`/students/dictate/${recording.id}`}>
                  <div className="flex items-start justify-between gap-3"><p className="truncate text-sm font-medium text-slate-950">{recording.originalFilename}</p><span className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${statusClasses[recording.status]}`}>{statusLabels[recording.status]}</span></div>
                  <p className="mt-1 text-xs text-slate-500">{recording.recordedDate} · {formatDuration(recording.durationSeconds)} · {transcriptWordCount(recording.transcript)} words</p>
                  {recording.transcript ? <p className="mt-1 text-xs leading-5 text-slate-600">{transcriptPreview(recording.transcript)}</p> : null}
                  {recording.studentIds.length ? <p className="mt-2 text-xs font-medium text-blue-700">{recording.studentIds.map((id) => studentNames.get(id) ?? "Unknown student").join(", ")}</p> : null}
                </Link>
              </li>
            ))}</ul>
          )}
        </section>

        <aside className="space-y-5">
          {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessages[error] ?? "Something went wrong. Try again."}</p> : null}
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Mic aria-hidden="true" className="size-4" />Upload a recording</h3>
            <form action={uploadAction} className="mt-3 space-y-3"><input name="durationSeconds" type="hidden" value={durationSeconds ?? ""} />
              <label className="block"><span className="text-sm font-medium text-slate-700">Audio file</span><input accept=".m4a,.mp3,.wav,.webm,.ogg,.aac,audio/*" className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700" name="recordingFile" onChange={(event) => captureDuration(event.target.files?.[0])} type="file" /></label>
              <label className="block"><span className="text-sm font-medium text-slate-700">Date this happened</span><input className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950" defaultValue={new Date().toISOString().slice(0, 10)} name="recordedDate" type="date" /></label>
              <button className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm" type="submit">Upload</button>
            </form>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Keyboard aria-hidden="true" className="size-4" />Paste or dictate text</h3><div className="mt-3"><DictationTextInput action={submitTextAction} /></div></section>
        </aside>
      </div>
    </>
  );
}
