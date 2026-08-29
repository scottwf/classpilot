import { mkdirSync } from "node:fs";
import { backup } from "node:sqlite";
import { dirname, join } from "node:path";
import type { ClassPilotDatabase } from "./sqlite";

/** Directory for pre-delete safety snapshots, next to the live database. */
export function schoolYearBackupDir(databasePath: string): string {
  return join(dirname(databasePath), "deleted-year-backups");
}

/**
 * Full-database snapshot taken immediately before deleting a school year
 * (issue #37) -- a whole-DB backup rather than a per-year export, so
 * nothing scoped to that year can be missed (classes, units, lessons,
 * schedule, students, contacts, notes, support plans, reminders, day
 * notes, custom roster fields/values -- everything `deleteSchoolYear`'s
 * cascade touches). Uses node:sqlite's built-in `backup()`, safe to run
 * against a live WAL-mode database -- the same mechanism as the nightly
 * `sqlite3 .backup` cron job (see docs/backup-and-recovery.md), just
 * triggered on demand from inside the app instead of a host-level script.
 * Returns the snapshot's path so the caller can report/log it.
 */
export async function backupBeforeSchoolYearDelete(
  db: ClassPilotDatabase,
  databasePath: string,
  schoolYearId: string,
): Promise<string> {
  const dir = schoolYearBackupDir(databasePath);
  mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = join(dir, `pre-delete-${schoolYearId}-${timestamp}.sqlite`);

  await backup(db, destination);

  return destination;
}
