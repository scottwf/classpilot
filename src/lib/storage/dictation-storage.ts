import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";

// Separate directory from attachment-storage.ts on purpose -- dictation
// recordings have a different lifecycle (never attached to a specific
// unit/lesson, kept indefinitely per issue #36) even though the file
// primitives below are the same shape.
const dictationDir =
  process.env.CLASSPILOT_DICTATION_DIR ?? join(process.cwd(), "data", "dictation-audio");

/** Common voice-memo export formats from a phone/watch/computer. */
export const allowedDictationExtensions = [".m4a", ".mp3", ".wav", ".webm", ".ogg", ".aac"];

/** Same ceiling as attachments -- a long recording is still well under this. */
export const maxDictationSizeBytes = 50 * 1024 * 1024;

export function isAllowedDictationFile(fileName: string): boolean {
  return allowedDictationExtensions.includes(extname(fileName).toLowerCase());
}

/** Generates the on-disk filename for a new recording -- never derived from
 * the uploaded filename, so there's no path-traversal surface. */
export function generateStoredDictationName(originalFileName: string): string {
  return `${randomUUID()}${extname(originalFileName).toLowerCase()}`;
}

export async function saveDictationFile(storedName: string, contents: Buffer): Promise<void> {
  await mkdir(dictationDir, { recursive: true });
  await writeFile(join(dictationDir, storedName), contents);
}

export async function readDictationFile(storedName: string): Promise<Buffer> {
  return readFile(join(dictationDir, storedName));
}

export async function deleteDictationFile(storedName: string): Promise<void> {
  try {
    await unlink(join(dictationDir, storedName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
