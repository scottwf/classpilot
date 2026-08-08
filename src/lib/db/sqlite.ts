import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type ClassPilotDatabase = DatabaseSync;

export function createClassPilotDatabase(databasePath: string): ClassPilotDatabase {
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON;");
  // WAL allows the Next.js app and the MCP server to hold the database file
  // open from separate processes at the same time without lock contention.
  db.exec("PRAGMA journal_mode = WAL;");
  migrate(db);
  return db;
}

export function migrate(db: ClassPilotDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS school_years (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      blocked_dates_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS class_sections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      grade TEXT NOT NULL,
      room TEXT NOT NULL,
      meeting_pattern TEXT NOT NULL
    );

    -- Singleton row tracking which school_years row is "active" (shown by
    -- default across the app). See src/lib/db/planner-repository.ts
    -- getActiveSchoolYearId().
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      active_school_year_id TEXT NOT NULL REFERENCES school_years(id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      ai_api_key_encrypted TEXT NOT NULL DEFAULT '',
      ai_base_url TEXT NOT NULL DEFAULT '',
      ai_model TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS curriculum_outcomes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      description TEXT NOT NULL,
      subject TEXT NOT NULL,
      grade TEXT NOT NULL,
      strand TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS unit_plans (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      color TEXT NOT NULL,
      outcome_ids_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lesson_plans (
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

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      school_year_id TEXT NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      preferred_name TEXT NOT NULL DEFAULT '',
      pronouns TEXT NOT NULL DEFAULT '',
      birthdate TEXT NOT NULL DEFAULT '',
      student_number TEXT NOT NULL DEFAULT '',
      strengths TEXT NOT NULL DEFAULT '',
      interests TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS student_contacts (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      is_primary INTEGER NOT NULL DEFAULT 0,
      is_emergency INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS communication_log (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      contact_id TEXT REFERENCES student_contacts(id) ON DELETE SET NULL,
      date TEXT NOT NULL,
      channel TEXT NOT NULL,
      direction TEXT NOT NULL DEFAULT 'outgoing',
      subject TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL,
      follow_up_required INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS student_notes (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      follow_up_status TEXT NOT NULL DEFAULT 'none',
      unit_id TEXT REFERENCES unit_plans(id) ON DELETE SET NULL,
      lesson_id TEXT REFERENCES lesson_plans(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_plans (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      plan_type TEXT NOT NULL,
      title TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      strategies TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      review_date TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
      due_date TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'follow_up',
      title TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      source_note_id TEXT REFERENCES student_notes(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT ''
    );

    -- A class's own meeting time on one cycle day — no shared "period"
    -- entity; see ScheduleSlot in src/features/planner/types.ts. Existing
    -- installs get migrated off the old periods/schedule_slots(period_id)
    -- shape by migrateAwayFromPeriods() below.
    CREATE TABLE IF NOT EXISTS schedule_slots (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
      cycle_day INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_students_year ON students(school_year_id, last_name);
    CREATE INDEX IF NOT EXISTS idx_contacts_student ON student_contacts(student_id);
    CREATE INDEX IF NOT EXISTS idx_comm_student ON communication_log(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_notes_student ON student_notes(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_support_student ON support_plans(student_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(status, due_date);
    CREATE INDEX IF NOT EXISTS idx_schedule_slots_class ON schedule_slots(class_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_slots_day ON schedule_slots(cycle_day);
  `);

  addColumnIfMissing(
    db,
    "lesson_plans",
    "sections_json",
    "TEXT NOT NULL DEFAULT '{}'",
  );
  addColumnIfMissing(
    db,
    "lesson_plans",
    "continues_from_lesson_id",
    "TEXT",
  );
  addColumnIfMissing(
    db,
    "school_years",
    "cycle_length_days",
    "INTEGER NOT NULL DEFAULT 5",
  );
  addColumnIfMissing(
    db,
    "class_sections",
    "cycle_days_json",
    "TEXT NOT NULL DEFAULT '[]'",
  );
  addColumnIfMissing(
    db,
    "class_sections",
    "target_minutes_per_year",
    "INTEGER",
  );
  addColumnIfMissing(
    db,
    "class_sections",
    "color",
    "TEXT NOT NULL DEFAULT 'blue'",
  );
  addColumnIfMissing(
    db,
    "class_sections",
    "is_instructional",
    "INTEGER NOT NULL DEFAULT 1",
  );
  addColumnIfMissing(
    db,
    "class_sections",
    "combined_grades_json",
    "TEXT NOT NULL DEFAULT '[]'",
  );
  addColumnIfMissing(
    db,
    "school_years",
    "day_label_scheme",
    "TEXT NOT NULL DEFAULT 'numeric'",
  );

  // Multi-year scoping. These columns can't carry a NOT NULL DEFAULT in the
  // same ALTER as a REFERENCES clause (SQLite restriction, verified against
  // node:sqlite), so they land nullable and get backfilled below instead.
  addColumnIfMissing(
    db,
    "class_sections",
    "school_year_id",
    "TEXT REFERENCES school_years(id) ON DELETE CASCADE",
  );

  backfillSchoolYearScoping(db);
  migrateAwayFromPeriods(db);
}

// Existing installs have a `periods` table (shared bell-schedule times) and
// schedule_slots(period_id). Classes are scheduled directly with their own
// (cycleDay, startTime, endTime) now — no shared period entity — so this
// moves each slot's period time onto the slot itself, then drops periods
// entirely. No-ops once already migrated (periods table gone) or on a
// brand-new install (never had one).
function migrateAwayFromPeriods(db: ClassPilotDatabase) {
  const periodsTableExists = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'periods'")
    .get();

  if (!periodsTableExists) {
    return;
  }

  const scheduleSlotsColumns = db.prepare("PRAGMA table_info(schedule_slots)").all() as Array<{
    name: string;
  }>;
  const alreadyMigrated = scheduleSlotsColumns.some((column) => column.name === "start_time");

  if (!alreadyMigrated) {
    db.exec("BEGIN;");
    try {
      db.exec(`
        CREATE TABLE schedule_slots_new (
          id TEXT PRIMARY KEY,
          class_id TEXT NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
          cycle_day INTEGER NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL
        );
      `);
      db.exec(`
        INSERT INTO schedule_slots_new (id, class_id, cycle_day, start_time, end_time)
        SELECT ss.id, ss.class_id, ss.cycle_day, p.start_time, p.end_time
        FROM schedule_slots ss
        JOIN periods p ON p.id = ss.period_id;
      `);
      db.exec("DROP TABLE schedule_slots;");
      db.exec("ALTER TABLE schedule_slots_new RENAME TO schedule_slots;");
      db.exec("CREATE INDEX IF NOT EXISTS idx_schedule_slots_class ON schedule_slots(class_id);");
      db.exec("CREATE INDEX IF NOT EXISTS idx_schedule_slots_day ON schedule_slots(cycle_day);");
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }
  }

  db.exec("DROP TABLE periods;");
}

// Points every pre-existing class_sections row at the earliest school_years
// row (there was only ever one before multi-year support), and
// bootstraps app_state so getActiveSchoolYearId() always has something to
// return. No-ops once already backfilled (checks IS NULL / NOT EXISTS), and
// no-ops entirely on a brand-new database (no school_years row yet — the
// seed step stamps school_year_id itself when it creates one).
function backfillSchoolYearScoping(db: ClassPilotDatabase) {
  const firstYear = db
    .prepare("SELECT id FROM school_years ORDER BY rowid LIMIT 1")
    .get() as { id: string } | undefined;

  if (!firstYear) {
    return;
  }

  db.prepare("UPDATE class_sections SET school_year_id = ? WHERE school_year_id IS NULL").run(
    firstYear.id,
  );
  db.prepare(
    `INSERT INTO app_state (id, active_school_year_id)
     SELECT 'current', ?
     WHERE NOT EXISTS (SELECT 1 FROM app_state WHERE id = 'current')`,
  ).run(firstYear.id);
}

function addColumnIfMissing(
  db: ClassPilotDatabase,
  tableName: string,
  columnName: string,
  definition: string,
) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
}
