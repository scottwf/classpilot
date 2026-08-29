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

    -- See src/lib/db/users-repository.ts (issue #21).
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Per-user MCP auth tokens (issue #21 Phase 4), replacing the old
    -- single shared CLASSPILOT_MCP_TOKEN env var. token_hash is a SHA-256
    -- digest -- see src/lib/db/mcp-tokens-repository.ts; the plaintext
    -- token is only ever available to the caller at creation time. A
    -- revoked token is kept (revoked_at set) rather than deleted, so
    -- "who had access and when" stays auditable.
    CREATE TABLE IF NOT EXISTS mcp_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL DEFAULT '',
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      last_used_at TEXT,
      revoked_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user ON mcp_tokens(user_id);

    -- Login lockout (issue #21 Phase 5 security checklist). One row per
    -- failed login attempt; see src/lib/auth/login-rate-limit.ts. Rows are
    -- pruned as they age out of the lockout window rather than kept
    -- forever -- this is a throttle, not an audit log.
    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username, created_at);

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

    -- date is nullable (issue #39): a lesson can exist as part of a unit's
    -- planned sequence before it's scheduled to a real calendar date.
    -- sequence is the source of truth for a lesson's position within its
    -- unit regardless of whether/when it's dated -- see mapLessonPlan and
    -- the ORDER BY sequence, rowid queries in planner-repository.ts.
    -- Calendar/schedule views (Plan Book, the ICS feed) filter to dated
    -- lessons only; unit/lesson-bank views show both.
    CREATE TABLE IF NOT EXISTS lesson_plans (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL REFERENCES unit_plans(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT,
      sequence INTEGER NOT NULL DEFAULT 0,
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

    -- One free-text note per (school year, date), shown at the top of that
    -- day's Dashboard schedule (issue #30). Deliberately singular per date
    -- rather than a list -- see src/lib/db/day-notes-repository.ts.
    CREATE TABLE IF NOT EXISTS day_notes (
      id TEXT PRIMARY KEY,
      school_year_id TEXT NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(school_year_id, date)
    );

    -- A dictated voice recording (issue #36), transcribed locally then
    -- turned into draft student_notes for review before anything saves.
    -- The audio file itself lives on disk (src/lib/storage/dictation-
    -- storage.ts), named by stored_filename -- never deleted (user
    -- decision 2026-08-23: keep the audio to re-listen against a bad
    -- transcript). status: 'pending' | 'transcribing' | 'transcribed' |
    -- 'failed'. See src/lib/db/dictation-repository.ts.
    CREATE TABLE IF NOT EXISTS dictation_recordings (
      id TEXT PRIMARY KEY,
      school_year_id TEXT NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
      stored_filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      recorded_date TEXT NOT NULL,
      duration_seconds INTEGER,
      transcript TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      student_ids_json TEXT NOT NULL DEFAULT '[]',
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_dictation_recordings_school_year ON dictation_recordings(school_year_id);

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

    -- One class's meeting on one specific date replaced by a non-academic
    -- event (assembly, fire drill, field trip) -- distinct from
    -- school_years.blocked_dates_json (a whole day, e.g. a holiday) and
    -- from class_sections.is_instructional (a permanent property of a
    -- whole recurring block, e.g. "Recess"). One row per (class_id, date);
    -- see schedule-exceptions-repository.ts.
    CREATE TABLE IF NOT EXISTS schedule_exceptions (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_exceptions_unique ON schedule_exceptions(class_id, date);

    -- Links and uploaded files attached to a unit or a lesson. Exactly one
    -- of unit_id/lesson_id is set. Uploaded files are stored on disk (see
    -- src/lib/storage/attachment-storage.ts) under stored_name, which is a
    -- generated name (never the original file_name) to avoid path
    -- traversal / collisions; file_name is only for display and download.
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      unit_id TEXT REFERENCES unit_plans(id) ON DELETE CASCADE,
      lesson_id TEXT REFERENCES lesson_plans(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      url TEXT NOT NULL DEFAULT '',
      file_name TEXT NOT NULL DEFAULT '',
      stored_name TEXT NOT NULL DEFAULT '',
      mime_type TEXT NOT NULL DEFAULT '',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      CHECK ((unit_id IS NOT NULL) != (lesson_id IS NOT NULL))
    );

    -- A teacher-defined column for the roster quick-entry grid (e.g. "Math
    -- Textbook #"), scoped per school year. position controls column order
    -- (assigned as "one past whatever's already there," same pattern as
    -- lesson_plans.sequence). See src/lib/db/roster-fields-repository.ts.
    CREATE TABLE IF NOT EXISTS roster_fields (
      id TEXT PRIMARY KEY,
      school_year_id TEXT NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- One cell of the roster quick-entry grid. A missing row means "blank"
    -- for that student/field pair -- saveRosterFieldValue deletes the row
    -- entirely on an empty value rather than storing ''.
    CREATE TABLE IF NOT EXISTS roster_field_values (
      id TEXT PRIMARY KEY,
      field_id TEXT NOT NULL REFERENCES roster_fields(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      UNIQUE(field_id, student_id)
    );

    -- A named, saved column-visibility set for the roster grid (e.g.
    -- "Textbook check": name + status + the textbook custom field only),
    -- so a teacher doesn't have to re-pick columns every time. columns_json
    -- is a plain string array mixing built-in column keys ("birthdate",
    -- "contactPhone", ...) and custom field keys ("field:<roster_field id>")
    -- -- see COLUMN_KEYS in RosterGrid.tsx for the built-in key list.
    CREATE TABLE IF NOT EXISTS roster_views (
      id TEXT PRIMARY KEY,
      school_year_id TEXT NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      columns_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_roster_fields_year ON roster_fields(school_year_id, position);
    CREATE INDEX IF NOT EXISTS idx_roster_field_values_student ON roster_field_values(student_id);
    CREATE INDEX IF NOT EXISTS idx_roster_views_year ON roster_views(school_year_id);

    CREATE INDEX IF NOT EXISTS idx_students_year ON students(school_year_id, last_name);
    CREATE INDEX IF NOT EXISTS idx_contacts_student ON student_contacts(student_id);
    CREATE INDEX IF NOT EXISTS idx_comm_student ON communication_log(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_notes_student ON student_notes(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_support_student ON support_plans(student_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(status, due_date);
    CREATE INDEX IF NOT EXISTS idx_schedule_slots_class ON schedule_slots(class_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_slots_day ON schedule_slots(cycle_day);
    CREATE INDEX IF NOT EXISTS idx_attachments_unit ON attachments(unit_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_lesson ON attachments(lesson_id);
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
    "app_settings",
    "ai_local_base_url",
    "TEXT NOT NULL DEFAULT ''",
  );
  addColumnIfMissing(
    db,
    "app_settings",
    "ai_local_model",
    "TEXT NOT NULL DEFAULT ''",
  );
  addColumnIfMissing(
    db,
    "school_years",
    "day_label_scheme",
    "TEXT NOT NULL DEFAULT 'numeric'",
  );

  // Multi-user data isolation (issue #21 Phase 2). Nullable for the same
  // reason school_year_id on class_sections is (SQLite can't add a NOT
  // NULL column with a REFERENCES clause in one ALTER) — backfilled to the
  // sole existing user by classpilot-db.ts on boot, not here, since which
  // user to backfill to is app-level bootstrapping (needs the app
  // password), not pure schema. active_school_year_id replaces the old
  // app_state singleton — "which year is active" is naturally a property
  // of a user. app_state itself is left in place (unused) rather than
  // dropped, to avoid extra migration risk for no benefit.
  addColumnIfMissing(
    db,
    "school_years",
    "user_id",
    "TEXT REFERENCES users(id) ON DELETE CASCADE",
  );
  addColumnIfMissing(
    db,
    "users",
    "active_school_year_id",
    "TEXT REFERENCES school_years(id)",
  );

  // Temporary/burst schedule slots (see ScheduleSlot in types.ts) — both
  // null means a regular, year-long recurring slot (unchanged behavior);
  // both set means a class temporarily claims this cycleDay/time only
  // between these dates.
  addColumnIfMissing(db, "schedule_slots", "start_date", "TEXT");
  addColumnIfMissing(db, "schedule_slots", "end_date", "TEXT");
  addColumnIfMissing(db, "unit_plans", "notes", "TEXT NOT NULL DEFAULT ''");

  // The class whose lesson fills a cancelled slot instead (e.g. Math's
  // period swapped for a Science lesson that day) -- see
  // schedule-exceptions-repository.ts. Null means "just cancelled," no
  // substitute.
  addColumnIfMissing(db, "schedule_exceptions", "substitute_class_id", "TEXT");

  // Draft per-student notes proposed from a dictation transcript (issue
  // #36 phases 3-4), pending teacher review -- never written to
  // student_notes until explicitly saved. JSON array of {draftId,
  // studentId, studentNameGuess, date, category, subject, body}. See
  // src/lib/db/dictation-repository.ts.
  addColumnIfMissing(db, "dictation_recordings", "drafts_json", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing(db, "dictation_recordings", "duration_seconds", "INTEGER");
  addColumnIfMissing(
    db,
    "dictation_recordings",
    "student_ids_json",
    "TEXT NOT NULL DEFAULT '[]'",
  );
  addColumnIfMissing(db, "dictation_recordings", "archived_at", "TEXT");

  // Undated, sequenced lessons (issue #39). date's NOT NULL constraint is
  // dropped by migrateLessonDatesNullable below (SQLite can't ALTER that
  // away in place); sequence is a plain additive column here.
  addColumnIfMissing(db, "lesson_plans", "sequence", "INTEGER NOT NULL DEFAULT 0");

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
  migrateLessonDatesNullable(db);
}

// Issue #39: lesson_plans.date was NOT NULL; SQLite can't drop a NOT NULL
// constraint via ALTER, so existing installs need a table rebuild (same
// shape as migrateAwayFromPeriods above). Backfills `sequence` per unit
// from each lesson's current (date, rowid) order, so nothing visually
// reshuffles for existing data -- new lessons get sequence assigned by
// createLesson going forward. No-ops once already migrated (date already
// nullable) or on a brand-new install (base CREATE TABLE above is already
// nullable).
function migrateLessonDatesNullable(db: ClassPilotDatabase) {
  const dateColumn = (
    db.prepare("PRAGMA table_info(lesson_plans)").all() as Array<{
      name: string;
      notnull: number;
    }>
  ).find((column) => column.name === "date");

  if (!dateColumn || dateColumn.notnull === 0) {
    return;
  }

  // student_notes.lesson_id and attachments.lesson_id both reference
  // lesson_plans(id) with ON DELETE actions. Verified against node:sqlite
  // directly: DROP TABLE on a table with incoming foreign keys actually
  // FIRES those ON DELETE actions (cascading deletes/nulls the dependent
  // rows) when `PRAGMA foreign_keys = ON` -- `defer_foreign_keys` only
  // defers the *violation check*, it does NOT stop the action itself, so
  // it does not help here. The only fix is turning foreign_keys off for
  // this whole rebuild (which SQLite only honors outside a transaction),
  // then back on and re-verifying with foreign_key_check before trusting
  // the result.
  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec("BEGIN;");
  try {
    db.exec(`
      CREATE TABLE lesson_plans_new (
        id TEXT PRIMARY KEY,
        unit_id TEXT NOT NULL REFERENCES unit_plans(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        date TEXT,
        sequence INTEGER NOT NULL DEFAULT 0,
        duration_minutes INTEGER NOT NULL,
        status TEXT NOT NULL,
        outcome_ids_json TEXT NOT NULL,
        sections_json TEXT NOT NULL DEFAULT '{}',
        summary TEXT NOT NULL,
        continues_from_lesson_id TEXT REFERENCES lesson_plans(id) ON DELETE SET NULL
      );
    `);
    db.exec(`
      INSERT INTO lesson_plans_new
        (id, unit_id, title, date, sequence, duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id)
      SELECT
        id, unit_id, title, date,
        ROW_NUMBER() OVER (PARTITION BY unit_id ORDER BY date, rowid),
        duration_minutes, status, outcome_ids_json, sections_json, summary, continues_from_lesson_id
      FROM lesson_plans;
    `);
    db.exec("DROP TABLE lesson_plans;");
    db.exec("ALTER TABLE lesson_plans_new RENAME TO lesson_plans;");
    db.exec("CREATE INDEX IF NOT EXISTS idx_lesson_plans_unit ON lesson_plans(unit_id);");
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    db.exec("PRAGMA foreign_keys = ON;");
    throw error;
  }

  db.exec("PRAGMA foreign_keys = ON;");

  const violations = db.prepare("PRAGMA foreign_key_check(attachments)").all();
  if (violations.length > 0) {
    throw new Error(
      "migrateLessonDatesNullable left dangling attachments.lesson_id references -- aborting.",
    );
  }
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
