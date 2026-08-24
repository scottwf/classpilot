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

describe("migrateLessonDatesNullable (via migrate())", () => {
  function buildPreMigrationSchema(db: DatabaseSync) {
    // Hand-built pre-#39 shape: date NOT NULL, no sequence column, plus
    // dependents (student_notes.lesson_id, attachments.lesson_id) that
    // reference lesson_plans(id) -- exactly what a real production
    // install has, and the reason the migration needs defer_foreign_keys.
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
        name TEXT NOT NULL
      );
      CREATE TABLE unit_plans (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        color TEXT NOT NULL,
        outcome_ids_json TEXT NOT NULL
      );
      CREATE TABLE lesson_plans (
        id TEXT PRIMARY KEY,
        unit_id TEXT NOT NULL REFERENCES unit_plans(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        status TEXT NOT NULL,
        outcome_ids_json TEXT NOT NULL,
        sections_json TEXT NOT NULL DEFAULT '{}',
        summary TEXT NOT NULL
      );
      CREATE TABLE attachments (
        id TEXT PRIMARY KEY,
        unit_id TEXT REFERENCES unit_plans(id) ON DELETE CASCADE,
        lesson_id TEXT REFERENCES lesson_plans(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        label TEXT NOT NULL
      );
    `);

    db.prepare(
      "INSERT INTO class_sections (id, name) VALUES ('class-1', 'Math 6')",
    ).run();
    db.prepare(
      "INSERT INTO unit_plans (id, class_id, title, start_date, end_date, color, outcome_ids_json) VALUES ('unit-1', 'class-1', 'Fractions', '2026-09-01', '2026-09-30', 'blue', '[]')",
    ).run();
    db.prepare(
      "INSERT INTO lesson_plans (id, unit_id, title, date, duration_minutes, status, outcome_ids_json, summary) VALUES (?, 'unit-1', ?, ?, 50, 'planned', '[]', '')",
    ).run("lesson-2", "Second", "2026-09-08");
    db.prepare(
      "INSERT INTO lesson_plans (id, unit_id, title, date, duration_minutes, status, outcome_ids_json, summary) VALUES (?, 'unit-1', ?, ?, 50, 'planned', '[]', '')",
    ).run("lesson-1", "First", "2026-09-01");
    db.prepare(
      "INSERT INTO attachments (id, lesson_id, kind, label) VALUES ('att-1', 'lesson-1', 'link', 'Reference')",
    ).run();
  }

  it("drops the NOT NULL constraint on date and backfills sequence from existing (date, rowid) order per unit", () => {
    const db = new DatabaseSync(temporaryDatabasePath());
    db.exec("PRAGMA foreign_keys = ON;");
    buildPreMigrationSchema(db);

    migrate(db);

    const lessons = db
      .prepare("SELECT id, date, sequence FROM lesson_plans ORDER BY sequence")
      .all() as Array<{ id: string; date: string; sequence: number }>;

    expect(lessons).toEqual([
      { id: "lesson-1", date: "2026-09-01", sequence: 1 },
      { id: "lesson-2", date: "2026-09-08", sequence: 2 },
    ]);

    // The dropped-NOT-NULL constraint actually works now.
    expect(() =>
      db
        .prepare(
          "INSERT INTO lesson_plans (id, unit_id, title, date, sequence, duration_minutes, status, outcome_ids_json, summary) VALUES ('lesson-3', 'unit-1', 'Third', NULL, 3, 50, 'planned', '[]', '')",
        )
        .run(),
    ).not.toThrow();
  });

  it("preserves rows in tables that reference lesson_plans(id)", () => {
    const db = new DatabaseSync(temporaryDatabasePath());
    db.exec("PRAGMA foreign_keys = ON;");
    buildPreMigrationSchema(db);

    migrate(db);

    const attachment = db
      .prepare("SELECT lesson_id FROM attachments WHERE id = 'att-1'")
      .get() as { lesson_id: string } | undefined;
    expect(attachment?.lesson_id).toBe("lesson-1");
  });

  it("is idempotent — running migrate() again after migration doesn't throw", () => {
    const db = new DatabaseSync(temporaryDatabasePath());
    db.exec("PRAGMA foreign_keys = ON;");
    buildPreMigrationSchema(db);
    migrate(db);

    expect(() => migrate(db)).not.toThrow();
  });
});
