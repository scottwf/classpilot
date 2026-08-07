// @vitest-environment node
//
// Vitest's default environment (jsdom, set globally in vitest.config.ts) is a
// browser-like sandbox that can't bundle the Node-only `node:sqlite` module
// this file (transitively) imports. Force the real Node environment here.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { migrate } from "./sqlite";

function temporaryDatabasePath() {
  return join(mkdtempSync(join(tmpdir(), "classpilot-migration-test-")), "test.sqlite");
}

describe("migrateAwayFromPeriods (via migrate())", () => {
  it("moves each slot's period time onto the slot itself and drops periods", () => {
    const db = new DatabaseSync(temporaryDatabasePath());
    db.exec("PRAGMA foreign_keys = ON;");

    // Hand-build the pre-migration schema: a school year, a class, a period,
    // and a schedule_slot referencing that period — the shape every
    // pre-existing production install actually has.
    db.exec(`
      CREATE TABLE school_years (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        blocked_dates_json TEXT NOT NULL
      );
      CREATE TABLE class_sections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        grade TEXT NOT NULL,
        room TEXT NOT NULL,
        meeting_pattern TEXT NOT NULL
      );
      CREATE TABLE periods (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE schedule_slots (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
        period_id TEXT NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
        cycle_day INTEGER NOT NULL
      );
    `);

    db.prepare(
      "INSERT INTO school_years (id, title, start_date, end_date, blocked_dates_json) VALUES (?, ?, ?, ?, ?)",
    ).run("current", "2026-2027", "2026-09-01", "2027-06-30", "[]");
    db.prepare(
      "INSERT INTO class_sections (id, name, subject, grade, room, meeting_pattern) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("class-1", "Math 6", "Mathematics", "6", "", "");
    db.prepare(
      "INSERT INTO periods (id, label, start_time, end_time, sort_order) VALUES (?, ?, ?, ?, ?)",
    ).run("period-1", "Period 1", "09:00", "09:50", 1);
    db.prepare(
      "INSERT INTO schedule_slots (id, class_id, period_id, cycle_day) VALUES (?, ?, ?, ?)",
    ).run("slot-1", "class-1", "period-1", 1);

    migrate(db);

    const slot = db
      .prepare("SELECT class_id, cycle_day, start_time, end_time FROM schedule_slots WHERE id = ?")
      .get("slot-1") as
      | { class_id: string; cycle_day: number; start_time: string; end_time: string }
      | undefined;

    expect(slot).toEqual({
      class_id: "class-1",
      cycle_day: 1,
      start_time: "09:00",
      end_time: "09:50",
    });

    const periodsTableExists = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'periods'")
      .get();
    expect(periodsTableExists).toBeUndefined();
  });

  it("is a no-op (doesn't throw) on a brand-new install with no periods table", () => {
    const db = new DatabaseSync(temporaryDatabasePath());
    db.exec("PRAGMA foreign_keys = ON;");

    expect(() => migrate(db)).not.toThrow();

    const slots = db.prepare("SELECT * FROM schedule_slots").all();
    expect(slots).toEqual([]);
  });

  it("is idempotent — running migrate() again after migration doesn't throw", () => {
    const db = new DatabaseSync(temporaryDatabasePath());
    db.exec("PRAGMA foreign_keys = ON;");
    migrate(db);

    expect(() => migrate(db)).not.toThrow();
  });
});
