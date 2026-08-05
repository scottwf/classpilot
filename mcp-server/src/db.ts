import { createClassPilotDatabase, type ClassPilotDatabase } from "../../src/lib/db/sqlite.ts";

const rawDatabasePath = process.env.CLASSPILOT_DATABASE_PATH;

if (!rawDatabasePath) {
  throw new Error("CLASSPILOT_DATABASE_PATH must be set to the same database file the ClassPilot app uses.");
}

const databasePath: string = rawDatabasePath;

let db: ClassPilotDatabase | undefined;

export function getDb(): ClassPilotDatabase {
  if (!db) {
    db = createClassPilotDatabase(databasePath);
  }
  return db;
}
