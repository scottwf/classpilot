import { createClassPilotDatabase, type ClassPilotDatabase } from "../../src/lib/db/sqlite.ts";
import { getSoleUser } from "../../src/lib/db/users-repository.ts";

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

/**
 * The MCP server shares CLASSPILOT_MCP_TOKEN across everyone who has it --
 * there's no per-token user identity yet (that's issue #21 Phase 4). Until
 * then, every MCP call resolves to the sole existing user, same as the
 * calendar feed (see app/calendar/feed.ics/route.ts). Requires the main
 * Next.js app to have handled at least one request first (it runs the
 * users-table backfill on boot; this process doesn't repeat that
 * bootstrapping since it only opens the database, not the app layer).
 */
export function getSoleUserId(): string {
  const user = getSoleUser(getDb());

  if (!user) {
    throw new Error(
      "No ClassPilot user exists yet -- log into the web app at least once before using the MCP server.",
    );
  }

  return user.id;
}
