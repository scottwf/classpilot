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
