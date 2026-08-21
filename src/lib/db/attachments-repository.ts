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

function ownerBelongsToUser(
  db: ClassPilotDatabase,
  owner: AttachmentOwner,
  userId: string,
): boolean {
  if ("unitId" in owner) {
    return !!db
      .prepare(
        `SELECT 1 FROM unit_plans
         JOIN class_sections ON class_sections.id = unit_plans.class_id
         JOIN school_years ON school_years.id = class_sections.school_year_id
         WHERE unit_plans.id = ? AND school_years.user_id = ?`,
      )
      .get(owner.unitId, userId);
  }

  return !!db
    .prepare(
      `SELECT 1 FROM lesson_plans
       JOIN unit_plans ON unit_plans.id = lesson_plans.unit_id
       JOIN class_sections ON class_sections.id = unit_plans.class_id
       JOIN school_years ON school_years.id = class_sections.school_year_id
       WHERE lesson_plans.id = ? AND school_years.user_id = ?`,
    )
    .get(owner.lessonId, userId);
}

/**
 * True if this attachment's owning unit or lesson belongs to userId. Used
 * directly by the download route (app/attachments/[id]/download/route.ts)
 * -- that route is called out explicitly in issue #21's security checklist
 * since it's the one place an attachment id alone (from a URL) grants
 * access to file content, not just JSON.
 */
export function attachmentBelongsToUser(
  db: ClassPilotDatabase,
  attachmentId: string,
  userId: string,
): boolean {
  return !!db
    .prepare(
      `SELECT 1 FROM attachments
       LEFT JOIN unit_plans ON unit_plans.id = attachments.unit_id
       LEFT JOIN lesson_plans ON lesson_plans.id = attachments.lesson_id
       LEFT JOIN unit_plans AS lesson_unit ON lesson_unit.id = lesson_plans.unit_id
       LEFT JOIN class_sections AS unit_class ON unit_class.id = unit_plans.class_id
       LEFT JOIN class_sections AS lesson_class ON lesson_class.id = lesson_unit.class_id
       LEFT JOIN school_years AS unit_year ON unit_year.id = unit_class.school_year_id
       LEFT JOIN school_years AS lesson_year ON lesson_year.id = lesson_class.school_year_id
       WHERE attachments.id = ? AND (unit_year.user_id = ? OR lesson_year.user_id = ?)`,
    )
    .get(attachmentId, userId, userId);
}

export function listAttachments(
  db: ClassPilotDatabase,
  userId: string,
  owner: AttachmentOwner,
): Attachment[] {
  if (!ownerBelongsToUser(db, owner, userId)) {
    return [];
  }

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
  userId: string,
  owner: AttachmentOwner,
  input: CreateLinkAttachmentInput,
): string {
  if (!ownerBelongsToUser(db, owner, userId)) {
    throw new Error(`${"unitId" in owner ? "Unit" : "Lesson"} not found: ${ownerId(owner)}`);
  }

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
  userId: string,
  owner: AttachmentOwner,
  input: CreateFileAttachmentInput,
): string {
  if (!ownerBelongsToUser(db, owner, userId)) {
    throw new Error(`${"unitId" in owner ? "Unit" : "Lesson"} not found: ${ownerId(owner)}`);
  }

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
 * `stored_name` to the client. Callers MUST check attachmentBelongsToUser
 * first (see app/attachments/[id]/download/route.ts) -- this function does
 * not check ownership itself since it's also used internally by
 * deleteAttachment, which checks ownership before calling it. */
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
export function deleteAttachment(
  db: ClassPilotDatabase,
  userId: string,
  id: string,
): string | undefined {
  if (!attachmentBelongsToUser(db, id, userId)) {
    return undefined;
  }

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
