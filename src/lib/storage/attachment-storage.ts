import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";

const attachmentsDir =
  process.env.CLASSPILOT_ATTACHMENTS_DIR ?? join(process.cwd(), "data", "attachments");

/** Extensions accepted for file uploads (checked case-insensitively against
 * the original filename) — covers documents, slides, spreadsheets, plain
 * text/markdown, images, and video, per the attachments feature request.
 * Rejecting everything else is deliberate: this app is single/small-team
 * use behind auth, but there's no reason to accept arbitrary executables. */
export const allowedAttachmentExtensions = [
  ".pdf",
  ".ppt",
  ".pptx",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".md",
  ".txt",
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".mp4",
  ".mov",
  ".webm",
  ".m4v",
];

/** Large enough for slide decks/videos, small enough to keep the app's data
 * volume from growing unbounded — also enforced via Next's server-actions
 * body size limit in next.config.ts (which must be >= this). */
export const maxAttachmentSizeBytes = 50 * 1024 * 1024;

export function isAllowedAttachmentFile(fileName: string): boolean {
  return allowedAttachmentExtensions.includes(extname(fileName).toLowerCase());
}

/** Generates the on-disk filename for a new upload — never derived from the
 * user-supplied name, so there's no path-traversal surface and no
 * collisions between attachments with the same original filename. */
export function generateStoredName(originalFileName: string): string {
  return `${randomUUID()}${extname(originalFileName).toLowerCase()}`;
}

export async function saveAttachmentFile(storedName: string, contents: Buffer): Promise<void> {
  await mkdir(attachmentsDir, { recursive: true });
  await writeFile(join(attachmentsDir, storedName), contents);
}

export async function readAttachmentFile(storedName: string): Promise<Buffer> {
  return readFile(join(attachmentsDir, storedName));
}

export async function deleteAttachmentFile(storedName: string): Promise<void> {
  try {
    await unlink(join(attachmentsDir, storedName));
  } catch (error) {
    // Already gone (e.g. a retried delete) — nothing left to clean up.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
