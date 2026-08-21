"use client";

import { useState } from "react";
import { FileText, Film, Image as ImageIcon, LinkIcon, Trash2 } from "lucide-react";
import type { Attachment } from "./types";

type ServerAction = (formData: FormData) => void | Promise<void>;

type AttachmentListProps = {
  attachments: Attachment[];
  createFileAction: ServerAction;
  createLinkAction: ServerAction;
  deleteAction: ServerAction;
  error?: string;
  ownerId: string;
  ownerType: "lesson" | "unit";
};

const errorMessages: Record<string, string> = {
  link: "Enter a label and a valid http(s) link.",
  file: "Enter a label and choose a file.",
  filetype: "That file type isn't supported. Allowed: PDF, PowerPoint, Word, Excel, Markdown, text, images, and video.",
  filesize: "That file is too large — the limit is 50 MB.",
};

const videoExtensions = [".mp4", ".mov", ".webm", ".m4v"];
const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

function attachmentIcon(attachment: Attachment) {
  if (attachment.kind === "link") {
    return LinkIcon;
  }
  const lowerName = attachment.fileName.toLowerCase();
  if (videoExtensions.some((extension) => lowerName.endsWith(extension))) {
    return Film;
  }
  if (imageExtensions.some((extension) => lowerName.endsWith(extension))) {
    return ImageIcon;
  }
  return FileText;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({
  attachments,
  createFileAction,
  createLinkAction,
  deleteAction,
  error,
  ownerId,
  ownerType,
}: AttachmentListProps) {
  const [mode, setMode] = useState<"link" | "file">("link");

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-950">Attachments</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Links, videos, and files (PDF, PowerPoint, Word, Markdown, and more) for this{" "}
        {ownerType}.
      </p>

      {error ? (
        <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorMessages[error] ?? "Please check the form and try again."}
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        {attachments.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
            No attachments yet.
          </p>
        ) : (
          attachments.map((attachment) => {
            const Icon = attachmentIcon(attachment);

            return (
              <div
                className="flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm"
                key={attachment.id}
              >
                <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <a
                    className="break-words font-medium text-blue-700 hover:text-blue-900"
                    href={
                      attachment.kind === "link"
                        ? attachment.url
                        : `/attachments/${attachment.id}/download`
                    }
                    rel="noreferrer"
                    target="_blank"
                  >
                    {attachment.label}
                  </a>
                  {attachment.kind === "file" ? (
                    <div className="mt-0.5 text-xs text-slate-500">
                      {attachment.fileName} · {formatFileSize(attachment.sizeBytes)}
                    </div>
                  ) : null}
                </div>
                <form action={deleteAction}>
                  <input name="ownerType" type="hidden" value={ownerType} />
                  <input name="ownerId" type="hidden" value={ownerId} />
                  <input name="attachmentId" type="hidden" value={attachment.id} />
                  <button
                    className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Delete attachment"
                    type="submit"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </button>
                </form>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
        <button
          className={`flex-1 rounded-md px-2 py-1.5 ${mode === "link" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
          onClick={() => setMode("link")}
          type="button"
        >
          Add link
        </button>
        <button
          className={`flex-1 rounded-md px-2 py-1.5 ${mode === "file" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
          onClick={() => setMode("file")}
          type="button"
        >
          Upload file
        </button>
      </div>

      {mode === "link" ? (
        <form action={createLinkAction} className="mt-3 space-y-2">
          <input name="ownerType" type="hidden" value={ownerType} />
          <input name="ownerId" type="hidden" value={ownerId} />
          <input
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            name="label"
            placeholder="Label (e.g. YouTube: fractions explainer)"
            required
            type="text"
          />
          <input
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            name="url"
            placeholder="https://..."
            required
            type="url"
          />
          <button
            className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
            type="submit"
          >
            Add link
          </button>
        </form>
      ) : (
        <form action={createFileAction} className="mt-3 space-y-2">
          <input name="ownerType" type="hidden" value={ownerType} />
          <input name="ownerId" type="hidden" value={ownerId} />
          <input
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            name="label"
            placeholder="Label (e.g. Unit rubric)"
            required
            type="text"
          />
          <input
            accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.md,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.webm,.m4v"
            className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700"
            name="file"
            required
            type="file"
          />
          <button
            className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
            type="submit"
          >
            Upload
          </button>
        </form>
      )}
    </section>
  );
}
