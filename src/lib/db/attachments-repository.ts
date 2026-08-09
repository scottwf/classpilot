import type { Attachment, AttachmentKind } from "@/src/features/planner/types";
import type { ClassPilotDatabase } from "./sqlite";

export type AttachmentOwner = { unitId: string } | { lessonId: string };

type AttachmentRow = {
  id: string;
  kind: AttachmentKind;
  label: string;
  url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

type AttachmentFileRow = {
  file_name: string;
  stored_name: string;
  mime_type: string;
};

function ownerColumn(owner: AttachmentOwner): "unit_id" | "lesson_id" {
  return "unitId" in owner ? "unit_id" : "lesson_id";
}

function ownerId(owner: AttachmentOwner): string {
  return "unitId" in owner ? owner.unitId : owner.lessonId;
}

export function listAttachments(db: ClassPilotDatabase, owner: AttachmentOwner): Attachment[] {
  const rows = db
    .prepare(
      `SELECT id, kind, label, url, file_name, mime_type, size_bytes, created_at
       FROM attachments WHERE ${ownerColumn(owner)} = ? ORDER BY created_at`,
    )
    .all(ownerId(owner)) as AttachmentRow[];

  return rows.map(mapAttachment);
}

export type CreateLinkAttachmentInput = {
  label: string;
  url: string;
};

export function createLinkAttachment(
  db: ClassPilotDatabase,
  owner: AttachmentOwner,
  input: CreateLinkAttachmentInput,
): string {
  const id = `attachment-${crypto.randomUUID()}`;

  db.prepare(
    `INSERT INTO attachments (id, ${ownerColumn(owner)}, kind, label, url, created_at)
     VALUES (?, ?, 'link', ?, ?, ?)`,
  ).run(id, ownerId(owner), input.label, input.url, new Date().toISOString());

  return id;
}

export type CreateFileAttachmentInput = {
  label: string;
  fileName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
};

export function createFileAttachment(
  db: ClassPilotDatabase,
  owner: AttachmentOwner,
  input: CreateFileAttachmentInput,
): string {
  const id = `attachment-${crypto.randomUUID()}`;

  db.prepare(
    `INSERT INTO attachments
       (id, ${ownerColumn(owner)}, kind, label, file_name, stored_name, mime_type, size_bytes, created_at)
     VALUES (?, ?, 'file', ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    ownerId(owner),
    input.label,
    input.fileName,
    input.storedName,
    input.mimeType,
    input.sizeBytes,
    new Date().toISOString(),
  );

  return id;
}

/** Looks up disk-file metadata for the download route — deliberately
 * separate from the public `Attachment` type, which never exposes
 * `stored_name` to the client. */
export function getAttachmentFileInfo(
  db: ClassPilotDatabase,
  id: string,
): { fileName: string; storedName: string; mimeType: string } | undefined {
  const row = db
    .prepare("SELECT file_name, stored_name, mime_type FROM attachments WHERE id = ? AND kind = 'file'")
    .get(id) as AttachmentFileRow | undefined;

  if (!row) {
    return undefined;
  }

  return { fileName: row.file_name, storedName: row.stored_name, mimeType: row.mime_type };
}

/** Deletes the DB row and returns the stored filename to remove from disk
 * (undefined for a link attachment, or if the attachment didn't exist) —
 * callers are responsible for the actual file deletion (see
 * src/lib/storage/attachment-storage.ts), keeping this repository DB-only. */
export function deleteAttachment(db: ClassPilotDatabase, id: string): string | undefined {
  const row = db.prepare("SELECT stored_name FROM attachments WHERE id = ?").get(id) as
    | { stored_name: string }
    | undefined;

  db.prepare("DELETE FROM attachments WHERE id = ?").run(id);

  return row?.stored_name || undefined;
}

function mapAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    url: row.url,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}
