import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type ClassPilotDatabase = DatabaseSync;

export function createClassPilotDatabase(databasePath: string): ClassPilotDatabase {
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON;");
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

    CREATE INDEX IF NOT EXISTS idx_students_year ON students(school_year_id, last_name);
    CREATE INDEX IF NOT EXISTS idx_contacts_student ON student_contacts(student_id);
    CREATE INDEX IF NOT EXISTS idx_comm_student ON communication_log(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_notes_student ON student_notes(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_support_student ON support_plans(student_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(status, due_date);
  `);

  addColumnIfMissing(
    db,
    "lesson_plans",
    "sections_json",
    "TEXT NOT NULL DEFAULT '{}'",
  );
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
