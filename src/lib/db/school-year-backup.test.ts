// @vitest-environment node
//
// Vitest's default environment (jsdom, set globally in vitest.config.ts) is a
// browser-like sandbox that can't bundle the Node-only `node:sqlite` module
// this file (transitively) imports. Force the real Node environment here.
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { plannerData } from "@/src/features/planner/seed-data";
import { seedPlannerData } from "./planner-repository";
import { backupBeforeSchoolYearDelete, schoolYearBackupDir } from "./school-year-backup";
import { createClassPilotDatabase } from "./sqlite";
import { createUser } from "./users-repository";

describe("schoolYearBackupDir", () => {
  it("puts snapshots in a sibling directory next to the database file", () => {
    expect(schoolYearBackupDir("/app/data/classpilot.sqlite")).toBe(
      "/app/data/deleted-year-backups",
    );
  });
});

describe("backupBeforeSchoolYearDelete", () => {
  it("writes a readable snapshot containing the school year's real data", async () => {
    const dbDir = mkdtempSync(join(tmpdir(), "classpilot-backup-"));
    const databasePath = join(dbDir, "classpilot.sqlite");
    const db = createClassPilotDatabase(databasePath);
    const userId = createUser(db, { username: "teacher", password: "x" }).id;
    seedPlannerData(db, userId, plannerData);

    const snapshotPath = await backupBeforeSchoolYearDelete(db, databasePath, "current");

    expect(existsSync(snapshotPath)).toBe(true);

    const snapshotDb = new DatabaseSync(snapshotPath, { readOnly: true });
    const schoolYear = snapshotDb
      .prepare("SELECT title FROM school_years WHERE id = ?")
      .get("current") as { title: string } | undefined;
    const classCount = (
      snapshotDb.prepare("SELECT COUNT(*) AS count FROM class_sections").get() as {
        count: number;
      }
    ).count;

    expect(schoolYear?.title).toBe(plannerData.schoolYear.title);
    expect(classCount).toBe(plannerData.classes.length);
  });
});
